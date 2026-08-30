-- 0102_fun_auth_has_perm_and_root.sql

CREATE OR REPLACE FUNCTION auth.fun_auth_has_perm(p_resource text, p_action text)
RETURNS boolean
LANGUAGE sql STABLE
SET search_path = auth, public
AS $$
  SELECT
    COALESCE((current_setting('request.jwt.claims', true)::jsonb ->> 'is_root')::boolean, false)
    OR COALESCE(
         (current_setting('request.jwt.claims', true)::jsonb -> 'perms' -> p_resource ->> p_action)::boolean,
         false
       );
$$;

GRANT EXECUTE ON FUNCTION auth.fun_auth_has_perm(text, text) TO anon, auth_user;

-- Re-issues a JWT scoped to a different tenant the caller already belongs to.
CREATE OR REPLACE FUNCTION auth.fun_auth__switch_tenant(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  v_user    uuid := auth.fun_auth_user_id();
  v_is_root boolean;
  v_perms   jsonb;
  v_claims  text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM auth.user_roles ur WHERE ur.user_id = v_user AND ur.tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'not a member of this tenant';
  END IF;

  SELECT is_root INTO v_is_root FROM auth.users WHERE uid = v_user;

  v_claims := jsonb_build_object(
    'user_id', v_user::text,
    'tenant_id', p_tenant_id::text,
    'is_root', COALESCE(v_is_root, false)
  )::text;
  PERFORM set_config('request.jwt.claims', v_claims, true);

  SELECT auth.get_auth__effective_permissions() INTO v_perms;

  RETURN jsonb_build_object(
    'user_uid', v_user::text,
    'tenant_uid', p_tenant_id::text,
    'is_root', COALESCE(v_is_root, false),
    'perms', COALESCE(v_perms, '{}'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION auth.fun_auth__switch_tenant(uuid) TO auth_user;

-- Root-only. Never callable by a non-root user_id — checked inside, not just by convention.
CREATE OR REPLACE FUNCTION auth.fun_auth__root_enter_tenant(p_tenant_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  v_user    uuid := auth.fun_auth_user_id();
  v_is_root boolean;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT is_root INTO v_is_root FROM auth.users WHERE uid = v_user;
  IF NOT COALESCE(v_is_root, false) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'reason is required';
  END IF;

  INSERT INTO auth.root_access_log (root_user_id, tenant_id, reason)
  VALUES (v_user, p_tenant_id, p_reason);

  RETURN jsonb_build_object(
    'user_uid', v_user::text,
    'tenant_uid', p_tenant_id::text,
    'is_root', true,
    'impersonating', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION auth.fun_auth__root_enter_tenant(uuid, text) TO auth_user;

NOTIFY pgrst, 'reload schema';
