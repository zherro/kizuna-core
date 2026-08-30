-- 0107_fix_definer_search_path_login_signup.sql
-- Security review finding (see task report): auth.fun_auth__signup_bootstrap (0008) and
-- auth.fun_auth__login_verify (0010) are SECURITY DEFINER functions with no `SET search_path`
-- pinned, and both call pgcrypto's crypt()/gen_salt() unqualified. This is the exact
-- search-path-hijack pattern 0105 already fixed once for fun_auth__has_permission: a
-- SECURITY DEFINER function resolves unqualified identifiers using the search_path active in the
-- calling session, so anything able to place a function named `crypt`/`gen_salt` earlier in that
-- search_path than pgcrypto's install schema — e.g. by creating it in `public`, which is
-- world-CREATE by default on many Postgres installs — could get it invoked with the definer's
-- privileges. Fix: pin the search_path on both functions and schema-qualify the pgcrypto calls,
-- same as pgcrypto's own install schema (`auth`, from 0001). Pure hardening via CREATE OR REPLACE,
-- same signature and logic otherwise.

CREATE OR REPLACE FUNCTION auth.fun_auth__signup_bootstrap(
    p_login    text,
    p_password text
)
RETURNS TABLE (
    user_uid   uuid,
    tenant_uid uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $function$
DECLARE
    v_user_uid   uuid := gen_random_uuid();
    v_tenant_uid uuid := gen_random_uuid();
BEGIN
    -- Cria usuario (necessario antes do tenant por FK)
    INSERT INTO auth.users (uid, login, password, is_active)
    VALUES (
               v_user_uid,
               p_login,
               auth.crypt(p_password, auth.gen_salt('bf', 10)),
               true
           );

    -- Cria tenant com o usuario como owner
    INSERT INTO auth.tenants (uid, owner_uid, name, type)
    VALUES (
               v_tenant_uid,
               v_user_uid,
               p_login,
               'USER'
           );

    -- Concede role admin (role_id = 2) no tenant
    INSERT INTO auth.user_roles (user_id, tenant_id, role_id)
    VALUES (
               v_user_uid,
               v_tenant_uid,
               2
           );

    RETURN QUERY
    SELECT v_user_uid, v_tenant_uid;
END;
$function$;

GRANT EXECUTE ON FUNCTION auth.fun_auth__signup_bootstrap(text, text) TO anon, auth_user;

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
  v_tenant uuid;
  v_tenant_type text;
BEGIN
  SELECT u.uid, u.password
    INTO v_uid, v_hash
  FROM auth.users u
  WHERE u.login = p_login;

  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  IF auth.crypt(p_password, v_hash) <> v_hash THEN
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

NOTIFY pgrst, 'reload schema';
