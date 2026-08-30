-- 0110_login_checks_active.sql
-- Real gap: auth.fun_auth__login_verify (0008/0107) never checked auth.users.is_active — a
-- blocked/deactivated account (is_active = false) could still authenticate successfully and get a
-- full session. Every other function that reads credentials/build claims calls this one
-- internally (auth.fun_auth__login_with_perms, 0106), so fixing it here fixes the whole login
-- chain in one place. Mandatory check, not optional — a login attempt for an inactive user must
-- fail exactly like a wrong password does (no row returned), not surface as a different error.
--
-- Pure hardening via CREATE OR REPLACE, same signature/search_path pinning as 0107 — only the
-- is_active check is new.

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

  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  IF auth.crypt(p_password, v_hash) <> v_hash THEN
    RETURN;
  END IF;

  -- Conta bloqueada/desativada (is_active = false, ou NULL tratado como bloqueado por
  -- seguranca) nunca autentica, mesmo com senha correta.
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

NOTIFY pgrst, 'reload schema';
