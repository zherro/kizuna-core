-- 0113_external_identities.sql
-- Login por provedor externo (Google agora; Apple/Facebook/etc. depois) sem senha.
--
-- Fluxo:
--   1. O servidor Next faz o OAuth (Authorization Code + PKCE) com o provedor e recebe as claims
--      do usuário direto do provedor (sub, email, email_verified, name).
--   2. Chama auth.fun_auth__external_login com um JWT curto assinado por ele mesmo com o claim
--      `purpose = "external_login"` — mesmo padrão do reset de senha (0112): anon pode EXECUTAR,
--      mas a função recusa sem o claim, e só o servidor conhece PGRST_JWT_SECRET. Sem isso um
--      cliente anônimo chamaria o PostgREST direto dizendo "sou o Google, email = da vítima".
--   3. A função acha a identidade (provider, subject); senão acha a conta pelo email verificado e
--      VINCULA (email é único); senão cria uma conta nova SEM senha.
--
-- Proteção contra pre-hijack ao vincular: se alguém cadastrou email+senha usando o email de outra
-- pessoa (sem nunca verificar), quando o dono real entra pelo Google a conta é dele — a senha
-- existente é ANULADA e sessions_revoked_at marcado. O dono legítimo que só esqueceu que tinha
-- senha usa "esqueci a senha" normalmente.
--
-- Também corrige uma falha latente de fun_auth__login_verify: com password NULL,
-- crypt(x, NULL) <> NULL dá NULL (não true) e o IF deixava passar — conta sem senha autenticaria
-- com QUALQUER senha. Agora hash nulo nunca autentica por senha.
--
-- Aditivo + idempotente.

-- ---------------------------------------------------------------------------------------------
-- users: senha opcional + verificação/revogação
-- ---------------------------------------------------------------------------------------------
ALTER TABLE auth.users ALTER COLUMN password DROP NOT NULL;

ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS email_verified_at   timestamptz;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS phone               text;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS phone_verified_at   timestamptz;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS sessions_revoked_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique_idx
  ON auth.users (phone) WHERE phone IS NOT NULL;

-- ---------------------------------------------------------------------------------------------
-- user_identities: uma linha por (provedor, id do usuário no provedor)
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth.user_identities (
  id            bigserial PRIMARY KEY,
  user_uid      uuid NOT NULL REFERENCES auth.users(uid) ON DELETE CASCADE,
  provider      text NOT NULL CHECK (provider ~ '^[a-z][a-z0-9_]{1,31}$'),
  subject       text NOT NULL,
  email         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz,
  CONSTRAINT user_identities_provider_subject_unique UNIQUE (provider, subject)
);

CREATE INDEX IF NOT EXISTS user_identities_user_idx ON auth.user_identities (user_uid);

-- Leitura só das próprias identidades (tela "Métodos de acesso"); escrita só pelas funções
-- SECURITY DEFINER abaixo.
ALTER TABLE auth.user_identities ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE auth.user_identities TO auth_user;

DROP POLICY IF EXISTS user_identities_select_own ON auth.user_identities;
CREATE POLICY user_identities_select_own ON auth.user_identities FOR SELECT TO auth_user
USING (user_uid = auth.fun_auth_user_id());

-- ---------------------------------------------------------------------------------------------
-- login_verify: hash nulo nunca autentica por senha
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth.fun_auth__login_verify(
  p_login text,
  p_password text
)
RETURNS TABLE (
  user_uid uuid,
  tenant_uid uuid,
  tenant_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  v_uid uuid;
  v_hash text;
  v_is_active boolean;
  v_tenant uuid;
  v_tenant_type text;
BEGIN
  SELECT u.uid, u.password, u.is_active
    INTO v_uid, v_hash, v_is_active
  FROM auth.users u
  WHERE u.login = p_login;

  IF v_uid IS NULL OR v_hash IS NULL OR p_password IS NULL THEN
    RETURN;
  END IF;

  IF auth.crypt(p_password, v_hash) IS DISTINCT FROM v_hash THEN
    RETURN;
  END IF;

  IF NOT COALESCE(v_is_active, false) THEN
    RETURN;
  END IF;

  SELECT ur.tenant_id
    INTO v_tenant
  FROM auth.user_roles ur
  WHERE ur.user_id = v_uid
  LIMIT 1;

  SELECT t.type
    INTO v_tenant_type
  FROM auth.tenants t
  WHERE t.uid = v_tenant
  LIMIT 1;

  RETURN QUERY
  SELECT v_uid, v_tenant, v_tenant_type;
END;
$$;

REVOKE ALL ON FUNCTION auth.fun_auth__login_verify(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth.fun_auth__login_verify(text, text) TO anon, auth_user;

-- ---------------------------------------------------------------------------------------------
-- build_login_result: monta o mesmo jsonb de fun_auth__login_with_perms para um usuário já
-- autenticado por outro meio (provedor externo, OTP). Interna — sem GRANT.
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth.fun_auth__build_login_result(p_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  v_tenant uuid;
  v_tenant_type text;
  v_is_root boolean;
  v_login text;
  v_perms jsonb;
BEGIN
  SELECT u.is_root, u.login INTO v_is_root, v_login FROM auth.users u WHERE u.uid = p_user;

  SELECT ur.tenant_id INTO v_tenant
  FROM auth.user_roles ur
  WHERE ur.user_id = p_user
  LIMIT 1;

  SELECT t.type INTO v_tenant_type FROM auth.tenants t WHERE t.uid = v_tenant LIMIT 1;

  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'user_id', p_user::text,
      'tenant_id', v_tenant::text,
      'tenant_type', v_tenant_type,
      'is_root', COALESCE(v_is_root, false)
    )::text,
    true
  );

  SELECT auth.get_auth__effective_permissions() INTO v_perms;

  RETURN jsonb_build_object(
    'user_uid', p_user::text,
    'tenant_uid', v_tenant::text,
    'tenant_type', v_tenant_type,
    'is_root', COALESCE(v_is_root, false),
    'login', v_login,
    'perms', COALESCE(v_perms, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION auth.fun_auth__build_login_result(uuid) FROM PUBLIC;

-- ---------------------------------------------------------------------------------------------
-- create_passwordless_user: mesma bootstrap de fun_auth__signup_bootstrap (tenant USER + role 2,
-- primeiro usuário do banco vira root), mas sem senha. Interna — sem GRANT.
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth.fun_auth__create_passwordless_user(
  p_login text,
  p_email_verified boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  v_user_uid   uuid := gen_random_uuid();
  v_tenant_uid uuid := gen_random_uuid();
  v_is_first   boolean;
BEGIN
  v_is_first := NOT EXISTS (SELECT 1 FROM auth.users);

  INSERT INTO auth.users (uid, login, password, is_active, is_root, email_verified_at)
  VALUES (
    v_user_uid,
    p_login,
    NULL,
    true,
    v_is_first,
    CASE WHEN p_email_verified THEN now() END
  );

  INSERT INTO auth.tenants (uid, owner_uid, name, type)
  VALUES (v_tenant_uid, v_user_uid, p_login, 'USER');

  INSERT INTO auth.user_roles (user_id, tenant_id, role_id)
  VALUES (v_user_uid, v_tenant_uid, 2);

  RETURN v_user_uid;
END;
$$;

REVOKE ALL ON FUNCTION auth.fun_auth__create_passwordless_user(text, boolean) FROM PUBLIC;

-- ---------------------------------------------------------------------------------------------
-- external_login
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth.fun_auth__external_login(
  p_provider text,
  p_subject text,
  p_email text,
  p_email_verified boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  v_email text := NULLIF(lower(trim(COALESCE(p_email, ''))), '');
  v_verified boolean := COALESCE(p_email_verified, false) AND v_email IS NOT NULL;
  v_user uuid;
  v_active boolean;
  v_email_verified_at timestamptz;
  v_profile_verified boolean := false;
  v_created boolean := false;
  v_linked boolean := false;
  v_login text;
BEGIN
  IF COALESCE(
       NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'purpose',
       ''
     ) <> 'external_login' THEN
    RAISE EXCEPTION 'external_login_forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_provider IS NULL OR p_provider !~ '^[a-z][a-z0-9_]{1,31}$' THEN
    RAISE EXCEPTION 'invalid_provider' USING ERRCODE = '22023';
  END IF;
  IF p_subject IS NULL OR length(trim(p_subject)) = 0 THEN
    RAISE EXCEPTION 'invalid_subject' USING ERRCODE = '22023';
  END IF;

  -- 1) Identidade já conhecida.
  SELECT i.user_uid INTO v_user
  FROM auth.user_identities i
  WHERE i.provider = p_provider AND i.subject = p_subject;

  IF v_user IS NOT NULL THEN
    UPDATE auth.user_identities
       SET last_login_at = now(), email = COALESCE(v_email, email)
     WHERE provider = p_provider AND subject = p_subject;
  ELSE
    -- 2) Conta existente com o mesmo email → vincula (só com email verificado pelo provedor).
    IF v_email IS NOT NULL THEN
      SELECT u.uid, u.email_verified_at
        INTO v_user, v_email_verified_at
      FROM auth.users u
      WHERE lower(u.login) = v_email
        AND u.deleted_at IS NULL
      LIMIT 1;
    END IF;

    IF v_user IS NOT NULL THEN
      IF NOT v_verified THEN
        -- Provedor não garante o email: vincular entregaria a conta a quem não prova ser dono.
        RAISE EXCEPTION 'email_not_verified' USING ERRCODE = '42501';
      END IF;

      -- Verificação feita antes pelo fluxo de email do plugin user_data também conta.
      IF v_email_verified_at IS NULL AND to_regclass('public.user_data') IS NOT NULL THEN
        EXECUTE 'SELECT COALESCE(bool_or(email_verified), false) FROM public.user_data WHERE user_id = $1'
          INTO v_profile_verified
          USING v_user;
      END IF;

      IF v_email_verified_at IS NULL AND NOT v_profile_verified THEN
        -- Pre-hijack: quem cadastrou este email sem prová-lo perde a senha e as sessões.
        UPDATE auth.users
           SET password = NULL,
               sessions_revoked_at = now(),
               email_verified_at = now()
         WHERE uid = v_user;
      ELSIF v_email_verified_at IS NULL THEN
        UPDATE auth.users SET email_verified_at = now() WHERE uid = v_user;
      END IF;

      v_linked := true;
    ELSE
      -- 3) Conta nova sem senha. login = email quando há; senão um identificador do provedor.
      v_login := COALESCE(v_email, p_provider || ':' || p_subject);
      v_user := auth.fun_auth__create_passwordless_user(v_login, v_verified);
      v_created := true;
    END IF;

    INSERT INTO auth.user_identities (user_uid, provider, subject, email, last_login_at)
    VALUES (v_user, p_provider, p_subject, v_email, now());
  END IF;

  SELECT u.is_active INTO v_active FROM auth.users u WHERE u.uid = v_user AND u.deleted_at IS NULL;
  IF NOT COALESCE(v_active, false) THEN
    RETURN NULL;
  END IF;

  RETURN auth.fun_auth__build_login_result(v_user)
    || jsonb_build_object('created', v_created, 'linked', v_linked);
END;
$$;

REVOKE ALL ON FUNCTION auth.fun_auth__external_login(text, text, text, boolean) FROM PUBLIC;
-- anon pode EXECUTAR, mas a função recusa sem o claim `purpose` (só o servidor assina esse JWT).
GRANT EXECUTE ON FUNCTION auth.fun_auth__external_login(text, text, text, boolean) TO anon;

NOTIFY pgrst, 'reload schema';
