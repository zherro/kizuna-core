-- 0114_phone_otp.sql
-- Login (e verificação) por telefone com código de uso único (OTP).
--
-- Fluxo:
--   1. POST /api/auth/otp/request → o servidor gera o código, grava só o HMAC dele via
--      auth.fun_auth__otp_create e entrega {telefone, código} à porta OtpProvider (o texto da
--      mensagem mora no gateway do provedor, não aqui).
--   2. POST /api/auth/otp/verify  → o servidor calcula o HMAC do código digitado e chama
--      auth.fun_auth__otp_verify, que queima o desafio e, para `login`, acha/cria a conta pelo
--      telefone; para `verify_phone`, vincula o telefone à conta logada.
--
-- Segurança (mesmo padrão de 0112/0113):
--   * Funções exigem o claim `purpose = "otp"` — só o servidor Next assina esse JWT.
--   * Banco guarda só HMAC(código) com segredo do servidor: vazar a tabela não revela códigos
--     (hash simples de 6 dígitos seria quebrado por força bruta em milissegundos).
--   * Uso único, expiração, no máx. 5 tentativas por desafio, cooldown de 60s e teto diário por
--     telefone. Pedir um novo invalida os anteriores.
--   * Telefone já usado por outra conta não é "roubado" no verify_phone (erro phone_in_use).
--
-- Tudo no schema auth. Aditivo + idempotente.

CREATE TABLE IF NOT EXISTS auth.otp_challenges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       text NOT NULL,
  purpose     text NOT NULL CHECK (purpose IN ('login', 'verify_phone')),
  user_uid    uuid REFERENCES auth.users(uid) ON DELETE CASCADE,
  code_hash   text NOT NULL,
  expires_at  timestamptz NOT NULL,
  attempts    integer NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  ip          text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS otp_challenges_phone_idx
  ON auth.otp_challenges (phone, purpose, created_at DESC);

-- Sem GRANT: só as funções SECURITY DEFINER abaixo tocam a tabela.
ALTER TABLE auth.otp_challenges ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION auth.fun_auth__otp_assert_purpose()
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = auth, public
AS $$
BEGIN
  IF COALESCE(
       NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'purpose',
       ''
     ) <> 'otp' THEN
    RAISE EXCEPTION 'otp_forbidden' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION auth.fun_auth__otp_assert_purpose() FROM PUBLIC;

/*
 * Registra um desafio. p_user_uid só em `verify_phone` (conta logada adicionando telefone).
 * Erros: otp_cooldown (pediu há < p_cooldown_sec), otp_daily_limit.
 */
CREATE OR REPLACE FUNCTION auth.fun_auth__otp_create(
  p_phone text,
  p_purpose text,
  p_code_hash text,
  p_ttl_sec integer DEFAULT 300,
  p_ip text DEFAULT NULL,
  p_user_uid uuid DEFAULT NULL,
  p_cooldown_sec integer DEFAULT 60,
  p_daily_limit integer DEFAULT 10
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  v_last timestamptz;
  v_today integer;
  v_id uuid;
BEGIN
  PERFORM auth.fun_auth__otp_assert_purpose();

  IF p_phone IS NULL OR p_phone !~ '^\+[1-9][0-9]{7,14}$' THEN
    RAISE EXCEPTION 'invalid_phone' USING ERRCODE = '22023';
  END IF;
  IF p_code_hash IS NULL OR length(p_code_hash) < 32 THEN
    RAISE EXCEPTION 'invalid_code_hash' USING ERRCODE = '22023';
  END IF;
  IF p_purpose = 'verify_phone' AND p_user_uid IS NULL THEN
    RAISE EXCEPTION 'user_required' USING ERRCODE = '22023';
  END IF;

  SELECT max(created_at), count(*) FILTER (WHERE created_at > now() - interval '24 hours')
    INTO v_last, v_today
  FROM auth.otp_challenges
  WHERE phone = p_phone;

  IF v_last IS NOT NULL AND v_last > now() - make_interval(secs => GREATEST(0, p_cooldown_sec)) THEN
    RAISE EXCEPTION 'otp_cooldown' USING ERRCODE = 'P0001';
  END IF;
  IF COALESCE(v_today, 0) >= GREATEST(1, p_daily_limit) THEN
    RAISE EXCEPTION 'otp_daily_limit' USING ERRCODE = 'P0001';
  END IF;

  UPDATE auth.otp_challenges
     SET consumed_at = now()
   WHERE phone = p_phone AND purpose = p_purpose AND consumed_at IS NULL;

  INSERT INTO auth.otp_challenges (phone, purpose, user_uid, code_hash, expires_at, ip)
  VALUES (
    p_phone,
    p_purpose,
    p_user_uid,
    p_code_hash,
    now() + make_interval(secs => GREATEST(60, LEAST(COALESCE(p_ttl_sec, 300), 1800))),
    p_ip
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

/*
 * Confere o código do desafio pendente mais recente.
 * Retorno:
 *   { ok: false, reason: 'invalid' | 'expired' | 'too_many_attempts' | 'phone_in_use' | 'blocked' }
 *   login        → { ok: true, ...fun_auth__build_login_result, created }
 *   verify_phone → { ok: true, user_uid }
 * Nunca lança por código errado: o incremento de tentativas precisa ser gravado.
 */
CREATE OR REPLACE FUNCTION auth.fun_auth__otp_verify(
  p_phone text,
  p_purpose text,
  p_code_hash text,
  p_user_uid uuid DEFAULT NULL,
  p_max_attempts integer DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  c auth.otp_challenges%ROWTYPE;
  v_user uuid;
  v_active boolean;
  v_created boolean := false;
BEGIN
  PERFORM auth.fun_auth__otp_assert_purpose();

  SELECT * INTO c
  FROM auth.otp_challenges
  WHERE phone = p_phone
    AND purpose = p_purpose
    AND consumed_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF c.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;

  IF c.expires_at <= now() THEN
    UPDATE auth.otp_challenges SET consumed_at = now() WHERE id = c.id;
    RETURN jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;

  IF p_purpose = 'verify_phone' AND c.user_uid IS DISTINCT FROM p_user_uid THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;

  IF c.code_hash IS DISTINCT FROM p_code_hash THEN
    UPDATE auth.otp_challenges
       SET attempts = attempts + 1,
           consumed_at = CASE WHEN attempts + 1 >= GREATEST(1, p_max_attempts) THEN now() END
     WHERE id = c.id;
    IF c.attempts + 1 >= GREATEST(1, p_max_attempts) THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'too_many_attempts');
    END IF;
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;

  UPDATE auth.otp_challenges SET consumed_at = now() WHERE id = c.id;

  IF p_purpose = 'verify_phone' THEN
    IF EXISTS (SELECT 1 FROM auth.users WHERE phone = p_phone AND uid <> c.user_uid) THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'phone_in_use');
    END IF;
    UPDATE auth.users
       SET phone = p_phone, phone_verified_at = now()
     WHERE uid = c.user_uid;
    RETURN jsonb_build_object('ok', true, 'user_uid', c.user_uid::text);
  END IF;

  -- login: conta pelo telefone; senão conta nova sem email/senha (login = telefone).
  SELECT u.uid INTO v_user
  FROM auth.users u
  WHERE u.phone = p_phone AND u.deleted_at IS NULL
  LIMIT 1;

  IF v_user IS NULL THEN
    v_user := auth.fun_auth__create_passwordless_user(p_phone, false);
    v_created := true;
  END IF;

  UPDATE auth.users
     SET phone = p_phone, phone_verified_at = COALESCE(phone_verified_at, now())
   WHERE uid = v_user;

  SELECT u.is_active INTO v_active FROM auth.users u WHERE u.uid = v_user;
  IF NOT COALESCE(v_active, false) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'blocked');
  END IF;

  RETURN jsonb_build_object('ok', true, 'created', v_created)
    || auth.fun_auth__build_login_result(v_user);
END;
$$;

REVOKE ALL ON FUNCTION auth.fun_auth__otp_create(text, text, text, integer, text, uuid, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth.fun_auth__otp_verify(text, text, text, uuid, integer) FROM PUBLIC;
-- anon pode EXECUTAR, mas as funções recusam sem o claim `purpose` (só o servidor assina esse JWT).
GRANT EXECUTE ON FUNCTION auth.fun_auth__otp_create(text, text, text, integer, text, uuid, integer, integer) TO anon;
GRANT EXECUTE ON FUNCTION auth.fun_auth__otp_verify(text, text, text, uuid, integer) TO anon;

NOTIFY pgrst, 'reload schema';
