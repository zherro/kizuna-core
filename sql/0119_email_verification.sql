-- 0119_email_verification.sql
-- Verificação do e-mail da conta por código (6 dígitos enviados por e-mail), no mesmo molde do
-- código por SMS (0114_phone_otp.sql). Marca auth.users.email_verified_at — o campo que o nível de
-- conta "contato verificado" lê (0115_account_facts.sql). Mantém public.user_data.email_verified em
-- sincronia quando a coluna existe (fluxo antigo de onboarding).
--
--   * O código nunca chega ao banco: o servidor guarda só um HMAC (segredo do JWT).
--   * As funções exigem o claim `purpose = "email_verify"` — só o servidor Next assina esse JWT.
--   * O e-mail de destino é o login da conta (auth.users.login), nunca um valor vindo do cliente.

CREATE TABLE IF NOT EXISTS auth.email_challenges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_uid    uuid NOT NULL REFERENCES auth.users (uid) ON DELETE CASCADE,
  email       text NOT NULL,
  code_hash   text NOT NULL,
  expires_at  timestamptz NOT NULL,
  attempts    integer NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_challenges_user_idx
  ON auth.email_challenges (user_uid, created_at DESC);

ALTER TABLE auth.email_challenges ENABLE ROW LEVEL SECURITY;
-- Sem policies: só as funções SECURITY DEFINER abaixo leem/escrevem.

CREATE OR REPLACE FUNCTION auth.fun_auth__email_verify_assert_purpose()
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = auth, public
AS $$
BEGIN
  IF COALESCE(
       NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'purpose',
       ''
     ) <> 'email_verify' THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION auth.fun_auth__email_verify_assert_purpose() FROM PUBLIC;

/**
 * Registra um código para o e-mail da conta. Devolve { email, already_verified }.
 * Erros: user_not_found, email_cooldown (pediu há < p_cooldown_sec), email_daily_limit.
 */
CREATE OR REPLACE FUNCTION auth.fun_auth__email_code_create(
  p_user_uid uuid,
  p_code_hash text,
  p_ttl_sec integer DEFAULT 900,
  p_cooldown_sec integer DEFAULT 60,
  p_daily_limit integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  v_email text;
  v_verified timestamptz;
  v_last timestamptz;
  v_today integer;
BEGIN
  PERFORM auth.fun_auth__email_verify_assert_purpose();

  IF p_code_hash IS NULL OR length(p_code_hash) < 32 THEN
    RAISE EXCEPTION 'invalid_code_hash' USING ERRCODE = '22023';
  END IF;

  SELECT u.login, u.email_verified_at INTO v_email, v_verified
  FROM auth.users u
  WHERE u.uid = p_user_uid AND u.deleted_at IS NULL;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'user_not_found' USING ERRCODE = 'P0001';
  END IF;
  IF v_verified IS NOT NULL THEN
    RETURN jsonb_build_object('email', v_email, 'already_verified', true);
  END IF;

  SELECT max(created_at), count(*) FILTER (WHERE created_at > now() - interval '24 hours')
    INTO v_last, v_today
  FROM auth.email_challenges
  WHERE user_uid = p_user_uid;

  IF v_last IS NOT NULL AND v_last > now() - make_interval(secs => GREATEST(0, p_cooldown_sec)) THEN
    RAISE EXCEPTION 'email_cooldown' USING ERRCODE = 'P0001';
  END IF;
  IF COALESCE(v_today, 0) >= GREATEST(1, p_daily_limit) THEN
    RAISE EXCEPTION 'email_daily_limit' USING ERRCODE = 'P0001';
  END IF;

  UPDATE auth.email_challenges
     SET consumed_at = now()
   WHERE user_uid = p_user_uid AND consumed_at IS NULL;

  INSERT INTO auth.email_challenges (user_uid, email, code_hash, expires_at)
  VALUES (
    p_user_uid,
    v_email,
    p_code_hash,
    now() + make_interval(secs => GREATEST(60, LEAST(COALESCE(p_ttl_sec, 900), 3600)))
  );

  RETURN jsonb_build_object('email', v_email, 'already_verified', false);
END;
$$;

/**
 * Confere o código. { ok: true } marca email_verified_at; senão
 * { ok: false, reason: 'invalid' | 'expired' | 'too_many_attempts' | 'no_challenge' }.
 */
CREATE OR REPLACE FUNCTION auth.fun_auth__email_code_verify(
  p_user_uid uuid,
  p_code_hash text,
  p_max_attempts integer DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  c auth.email_challenges%ROWTYPE;
BEGIN
  PERFORM auth.fun_auth__email_verify_assert_purpose();

  SELECT * INTO c
  FROM auth.email_challenges
  WHERE user_uid = p_user_uid AND consumed_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_challenge');
  END IF;

  IF c.expires_at <= now() THEN
    UPDATE auth.email_challenges SET consumed_at = now() WHERE id = c.id;
    RETURN jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;

  IF c.code_hash <> p_code_hash THEN
    UPDATE auth.email_challenges
       SET attempts = attempts + 1,
           consumed_at = CASE WHEN attempts + 1 >= GREATEST(1, p_max_attempts) THEN now() END
     WHERE id = c.id;
    IF c.attempts + 1 >= GREATEST(1, p_max_attempts) THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'too_many_attempts');
    END IF;
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;

  UPDATE auth.email_challenges SET consumed_at = now() WHERE id = c.id;
  UPDATE auth.users SET email_verified_at = COALESCE(email_verified_at, now()) WHERE uid = p_user_uid;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_data' AND column_name = 'email_verified'
  ) THEN
    EXECUTE 'UPDATE public.user_data SET email_verified = true WHERE user_id = $1' USING p_user_uid;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION auth.fun_auth__email_code_create(uuid, text, integer, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth.fun_auth__email_code_verify(uuid, text, integer) FROM PUBLIC;
-- anon pode EXECUTAR, mas as funções recusam sem o claim `purpose` (só o servidor assina esse JWT).
GRANT EXECUTE ON FUNCTION auth.fun_auth__email_code_create(uuid, text, integer, integer, integer) TO anon, auth_user;
GRANT EXECUTE ON FUNCTION auth.fun_auth__email_code_verify(uuid, text, integer) TO anon, auth_user;

NOTIFY pgrst, 'reload schema';
