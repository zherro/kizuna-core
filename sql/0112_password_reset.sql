-- 0112_password_reset.sql
-- Recuperação de senha ("esqueci minha senha") por link enviado por e-mail.
--
-- Fluxo:
--   1. POST /api/auth/forgot-password → o servidor gera um token aleatório, grava só o SHA-256
--      dele via auth.fun_auth__password_reset_request e envia o token puro por e-mail.
--   2. POST /api/auth/reset-password  → o servidor calcula o SHA-256 do token recebido e chama
--      auth.fun_auth__password_reset_confirm, que troca a senha e queima o token.
--
-- Segurança:
--   * O banco guarda só o hash do token — vazar a tabela não permite resetar ninguém.
--   * As duas funções exigem o claim `purpose = "password_reset"` no JWT da requisição. Esse JWT é
--     assinado pelo servidor Next com PGRST_JWT_SECRET (só ele conhece o segredo), então um
--     cliente anônimo chamando o PostgREST direto não consegue criar token para a conta de outra
--     pessoa (o que permitiria sequestrar a conta escolhendo o próprio token).
--   * Token de uso único, com expiração; pedir um novo invalida os anteriores; trocar a senha
--     invalida todos os pendentes do usuário.
--   * Conta inativa (is_active = false) nunca recebe token.
--
-- Aditivo + idempotente.

CREATE TABLE IF NOT EXISTS auth.password_reset_tokens (
  id bigserial PRIMARY KEY,
  user_uid uuid NOT NULL REFERENCES auth.users(uid) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx
  ON auth.password_reset_tokens (user_uid);

-- Sem GRANT para anon/auth_user: a tabela só é acessada pelas funções SECURITY DEFINER abaixo.
ALTER TABLE auth.password_reset_tokens ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION auth.fun_auth__password_reset_assert_purpose()
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = auth, public
AS $$
BEGIN
  IF COALESCE(
       NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'purpose',
       ''
     ) <> 'password_reset' THEN
    RAISE EXCEPTION 'password_reset_forbidden' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION auth.fun_auth__password_reset_assert_purpose() FROM PUBLIC;

/*
 * Registra um token de reset para o login informado.
 * Retorna true quando existe conta ativa com esse login (o servidor só envia e-mail nesse caso),
 * false caso contrário. O servidor responde a mesma mensagem nos dois casos (sem enumeração).
 */
CREATE OR REPLACE FUNCTION auth.fun_auth__password_reset_request(
  p_login text,
  p_token_hash text,
  p_ttl_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  PERFORM auth.fun_auth__password_reset_assert_purpose();

  IF p_token_hash IS NULL OR length(p_token_hash) < 32 THEN
    RAISE EXCEPTION 'invalid_token_hash' USING ERRCODE = '22023';
  END IF;

  SELECT u.uid
    INTO v_uid
  FROM auth.users u
  WHERE lower(u.login) = lower(trim(p_login))
    AND COALESCE(u.is_active, false)
    AND u.deleted_at IS NULL
  LIMIT 1;

  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  -- Um pedido novo invalida os anteriores ainda pendentes.
  UPDATE auth.password_reset_tokens
     SET used_at = now()
   WHERE user_uid = v_uid
     AND used_at IS NULL;

  INSERT INTO auth.password_reset_tokens (user_uid, token_hash, expires_at)
  VALUES (
    v_uid,
    p_token_hash,
    now() + make_interval(mins => GREATEST(5, LEAST(COALESCE(p_ttl_minutes, 60), 1440)))
  );

  RETURN true;
END;
$$;

/*
 * Troca a senha usando um token válido (não usado, não expirado, conta ativa).
 * Retorna true em caso de sucesso, false se o token for inválido/expirado.
 */
CREATE OR REPLACE FUNCTION auth.fun_auth__password_reset_confirm(
  p_token_hash text,
  p_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  v_token_id bigint;
  v_uid uuid;
BEGIN
  PERFORM auth.fun_auth__password_reset_assert_purpose();

  IF p_password IS NULL OR length(p_password) < 6 THEN
    RAISE EXCEPTION 'password_too_short' USING ERRCODE = '22023';
  END IF;

  SELECT t.id, t.user_uid
    INTO v_token_id, v_uid
  FROM auth.password_reset_tokens t
  JOIN auth.users u ON u.uid = t.user_uid
  WHERE t.token_hash = p_token_hash
    AND t.used_at IS NULL
    AND t.expires_at > now()
    AND COALESCE(u.is_active, false)
    AND u.deleted_at IS NULL
  FOR UPDATE OF t;

  IF v_token_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE auth.users
     SET password = auth.crypt(p_password, auth.gen_salt('bf', 10))
   WHERE uid = v_uid;

  -- Queima este token e qualquer outro pendente do mesmo usuário.
  UPDATE auth.password_reset_tokens
     SET used_at = now()
   WHERE user_uid = v_uid
     AND used_at IS NULL;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION auth.fun_auth__password_reset_request(text, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION auth.fun_auth__password_reset_confirm(text, text) FROM PUBLIC;
-- anon pode EXECUTAR, mas a função recusa sem o claim `purpose` (só o servidor assina esse JWT).
GRANT EXECUTE ON FUNCTION auth.fun_auth__password_reset_request(text, text, integer) TO anon;
GRANT EXECUTE ON FUNCTION auth.fun_auth__password_reset_confirm(text, text) TO anon;

NOTIFY pgrst, 'reload schema';
