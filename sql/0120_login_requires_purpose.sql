-- sql/0120_login_requires_purpose.sql
-- `fun_auth__login_with_perms` tinha EXECUTE para anon: com o PostgREST alcançável, qualquer um
-- testava senhas direto nele, sem o captcha, o rate-limit e o lockout das rotas /api/auth/*.
-- Agora exige o claim `purpose = 'login'` (mesmo padrão de external_login, OTP e reset de senha);
-- auth-handlers.ts assina esse JWT com `purposeAuthHeader('login')`. Corpo igual ao do 0106.

CREATE OR REPLACE FUNCTION auth.fun_auth__login_with_perms(
  p_login text,
  p_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  v_user uuid;
  v_tenant uuid;
  v_tenant_type text;
  v_is_root boolean;
  v_perms jsonb;
  v_claims text;
BEGIN
  -- Só o servidor Next chama (JWT com `purpose: login`, assinado com o segredo do app). Direto no
  -- PostgREST, sem esse claim, é recusado: senão dava para testar senhas pulando captcha e lockout.
  IF COALESCE(
       NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'purpose',
       ''
     ) <> 'login' THEN
    RAISE EXCEPTION 'login_forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT user_uid, tenant_uid, tenant_type
    INTO v_user, v_tenant, v_tenant_type
  FROM auth.fun_auth__login_verify(p_login, p_password)
  LIMIT 1;

  IF v_user IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT is_root INTO v_is_root FROM auth.users WHERE uid = v_user;

  v_claims :=
    jsonb_build_object(
      'user_id', v_user::text,
      'tenant_id', v_tenant::text,
      'tenant_type', v_tenant_type,
      'is_root', COALESCE(v_is_root, false)
    )::text;

  PERFORM set_config('request.jwt.claims', v_claims, true);

  SELECT auth.get_auth__effective_permissions()
    INTO v_perms;

  RETURN jsonb_build_object(
    'user_uid', v_user::text,
    'tenant_uid', v_tenant::text,
    'tenant_type', v_tenant_type,
    'is_root', COALESCE(v_is_root, false),
    'perms', COALESCE(v_perms, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION auth.fun_auth__login_with_perms(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth.fun_auth__login_with_perms(text, text) TO anon, auth_user;

NOTIFY pgrst, 'reload schema';
