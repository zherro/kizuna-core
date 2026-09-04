-- 0111_rbac_admin_delegation.sql
-- Delegated administration for the RBAC admin screens (RolesManager / UserAccessManager).
--
-- Adds the "you can only hand out what you hold" rule that 0101/0104 never enforced:
--   * a non-root caller may grant permission P (to a role or as a per-user `allow` override)
--     only if P is currently effective for that caller;
--   * a non-root caller may assign role R to a user only if every permission R confers is one
--     the caller could grant individually;
--   * `deny` overrides and role removals are never escalation, so they stay unrestricted (beyond
--     the existing tenant + `tenant_member.manage` gate).
-- Also lets `is_root` edit the global template roles' grants (ROOT/ADMIN/USER), which 0101
-- deliberately froze as seed-only.
--
-- Additive + idempotent. No new tables. `auth.roles.active` is added for logical deletion
-- (roles are never hard-deleted by the UI); permission grants themselves are plain config rows
-- and are toggled directly, not soft-deleted.

ALTER TABLE auth.roles ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- auth.roles has RLS enabled since 0007 but never got a SELECT policy, so PostgREST reads of
-- /roles come back empty. The admin screens need the role list; role names are not sensitive.
GRANT SELECT ON TABLE auth.roles TO auth_user;
DROP POLICY IF EXISTS roles_select_policy ON auth.roles;
CREATE POLICY roles_select_policy ON auth.roles FOR SELECT TO auth_user
USING (tenant_id IS NULL OR tenant_id = auth.fun_auth_current_tenant_id());

-- Nav/gate permission for the "Acessos" admin screen. `tenant_member.manage` (0104) is the real
-- write gate; `.view` just decides whether the menu item / page is reachable. ADMIN gets both.
INSERT INTO auth.permissions (resource, action, name)
VALUES ('tenant_member', 'view', 'Ver membros e permissões do tenant')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO auth.role_grants (role_id, permission_id)
SELECT 2, id FROM auth.permissions WHERE resource = 'tenant_member' AND action = 'view'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Helper: can the current caller grant this single permission?
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth.fun_auth_can_grant(p_permission_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = auth, public
AS $$
  SELECT
    COALESCE((current_setting('request.jwt.claims', true)::jsonb ->> 'is_root')::boolean, false)
    OR EXISTS (
      SELECT 1
      FROM auth.permissions p
      WHERE p.id = p_permission_id
        AND COALESCE(
              (current_setting('request.jwt.claims', true)::jsonb
                 -> 'perms' -> p.resource ->> p.action)::boolean,
              false
            )
    );
$$;

GRANT EXECUTE ON FUNCTION auth.fun_auth_can_grant(bigint) TO auth_user;

-- ---------------------------------------------------------------------------
-- Helper: can the current caller assign this whole role to a user?
-- True when root, or when the caller can grant every permission the role confers.
-- A role with zero grants (e.g. USER) is assignable by anyone with tenant_member.manage.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth.fun_auth_can_assign_role(p_role_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = auth, public
AS $$
  SELECT
    COALESCE((current_setting('request.jwt.claims', true)::jsonb ->> 'is_root')::boolean, false)
    OR NOT EXISTS (
      SELECT 1
      FROM auth.role_grants rg
      WHERE rg.role_id = p_role_id
        AND NOT auth.fun_auth_can_grant(rg.permission_id)
    );
$$;

GRANT EXECUTE ON FUNCTION auth.fun_auth_can_assign_role(bigint) TO auth_user;

-- ---------------------------------------------------------------------------
-- role_grants: keep the tenant-custom-role + tenant_member.manage gate from 0104,
-- add an is_root branch for the global template roles, and require can_grant per row
-- for the non-root path.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS role_grants_write_policy ON auth.role_grants;
CREATE POLICY role_grants_write_policy ON auth.role_grants FOR ALL TO auth_user
USING (
  COALESCE((current_setting('request.jwt.claims', true)::jsonb ->> 'is_root')::boolean, false)
  OR (
    EXISTS (
      SELECT 1 FROM auth.roles r
      WHERE r.id = role_grants.role_id
        AND r.tenant_id IS NOT NULL
        AND r.tenant_id = auth.fun_auth_current_tenant_id()
    )
    AND auth.fun_auth_has_perm('tenant_member', 'manage')
  )
)
WITH CHECK (
  COALESCE((current_setting('request.jwt.claims', true)::jsonb ->> 'is_root')::boolean, false)
  OR (
    EXISTS (
      SELECT 1 FROM auth.roles r
      WHERE r.id = role_grants.role_id
        AND r.tenant_id IS NOT NULL
        AND r.tenant_id = auth.fun_auth_current_tenant_id()
    )
    AND auth.fun_auth_has_perm('tenant_member', 'manage')
    AND auth.fun_auth_can_grant(permission_id)
  )
);

-- ---------------------------------------------------------------------------
-- user_tenant_permissions: keep tenant + tenant_member.manage gate from 0104,
-- add can_grant for `allow` rows only (`deny` is not escalation).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS utp_write_policy ON auth.user_tenant_permissions;
CREATE POLICY utp_write_policy ON auth.user_tenant_permissions FOR ALL TO auth_user
USING (
  tenant_id = auth.fun_auth_current_tenant_id()
  AND auth.fun_auth_has_perm('tenant_member', 'manage')
)
WITH CHECK (
  tenant_id = auth.fun_auth_current_tenant_id()
  AND auth.fun_auth_has_perm('tenant_member', 'manage')
  AND (effect = 'deny' OR auth.fun_auth_can_grant(permission_id))
);

-- ---------------------------------------------------------------------------
-- user_roles: replace the legacy jsonb `rbac.grant` check (0007) with the modern
-- tenant_member.manage gate + per-role delegation ceiling. INSERT adds an assignment,
-- DELETE removes one; removal only needs the manage gate.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS user_roles_insert_policy ON auth.user_roles;
CREATE POLICY user_roles_insert_policy ON auth.user_roles FOR INSERT TO auth_user
WITH CHECK (
  tenant_id = auth.fun_auth_current_tenant_id()
  AND auth.fun_auth_has_perm('tenant_member', 'manage')
  AND auth.fun_auth_can_assign_role(role_id)
);

DROP POLICY IF EXISTS user_roles_delete_policy ON auth.user_roles;
CREATE POLICY user_roles_delete_policy ON auth.user_roles FOR DELETE TO auth_user
USING (
  tenant_id = auth.fun_auth_current_tenant_id()
  AND auth.fun_auth_has_perm('tenant_member', 'manage')
);

-- ---------------------------------------------------------------------------
-- Mutation RPCs for the admin screens. All SECURITY INVOKER — the policies above
-- are the real boundary; these just wrap the insert/delete so the client sends one
-- intent ("grant this / revoke this") instead of juggling composite-key rows.
-- ---------------------------------------------------------------------------

-- Toggle one role -> permission grant.
CREATE OR REPLACE FUNCTION auth.fn_rbac__set_role_grant(
  p_role_id bigint,
  p_permission_id bigint,
  p_granted boolean
)
RETURNS void
LANGUAGE plpgsql
SET search_path = auth, public
AS $$
BEGIN
  IF p_granted THEN
    INSERT INTO auth.role_grants (role_id, permission_id)
    VALUES (p_role_id, p_permission_id)
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  ELSE
    DELETE FROM auth.role_grants
    WHERE role_id = p_role_id AND permission_id = p_permission_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION auth.fn_rbac__set_role_grant(bigint, bigint, boolean) TO auth_user;

-- Set (or clear) a per-user allow/deny override. p_effect NULL removes the override.
CREATE OR REPLACE FUNCTION auth.fn_rbac__set_user_override(
  p_user_id uuid,
  p_permission_id bigint,
  p_effect text
)
RETURNS void
LANGUAGE plpgsql
SET search_path = auth, public
AS $$
DECLARE
  v_tenant uuid := auth.fun_auth_current_tenant_id();
BEGIN
  IF p_effect IS NULL THEN
    DELETE FROM auth.user_tenant_permissions
    WHERE user_id = p_user_id AND tenant_id = v_tenant AND permission_id = p_permission_id;
  ELSIF p_effect IN ('allow', 'deny') THEN
    INSERT INTO auth.user_tenant_permissions (user_id, tenant_id, permission_id, effect)
    VALUES (p_user_id, v_tenant, p_permission_id, p_effect)
    ON CONFLICT (user_id, tenant_id, permission_id) DO UPDATE SET effect = EXCLUDED.effect;
  ELSE
    RAISE EXCEPTION 'p_effect must be allow, deny or null';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION auth.fn_rbac__set_user_override(uuid, bigint, text) TO auth_user;

-- Replace a user's single base role in the current tenant.
CREATE OR REPLACE FUNCTION auth.fn_rbac__set_user_role(
  p_user_id uuid,
  p_role_id bigint
)
RETURNS void
LANGUAGE plpgsql
SET search_path = auth, public
AS $$
DECLARE
  v_tenant uuid := auth.fun_auth_current_tenant_id();
BEGIN
  DELETE FROM auth.user_roles
  WHERE user_id = p_user_id AND tenant_id = v_tenant AND role_id <> p_role_id;

  INSERT INTO auth.user_roles (user_id, tenant_id, role_id)
  VALUES (p_user_id, v_tenant, p_role_id)
  ON CONFLICT (tenant_id, user_id, role_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION auth.fn_rbac__set_user_role(uuid, bigint) TO auth_user;

-- Copy every `allow` override from one user to another in the current tenant,
-- skipping any permission the caller is not allowed to grant. Existing target
-- overrides are left as-is unless the source also has them.
CREATE OR REPLACE FUNCTION auth.fn_rbac__copy_user_access(
  p_source_user uuid,
  p_target_user uuid
)
RETURNS integer
LANGUAGE plpgsql
SET search_path = auth, public
AS $$
DECLARE
  v_tenant uuid := auth.fun_auth_current_tenant_id();
  v_count  integer := 0;
BEGIN
  WITH ins AS (
    INSERT INTO auth.user_tenant_permissions (user_id, tenant_id, permission_id, effect)
    SELECT p_target_user, v_tenant, utp.permission_id, utp.effect
    FROM auth.user_tenant_permissions utp
    WHERE utp.user_id = p_source_user
      AND utp.tenant_id = v_tenant
      AND (utp.effect = 'deny' OR auth.fun_auth_can_grant(utp.permission_id))
    ON CONFLICT (user_id, tenant_id, permission_id) DO UPDATE SET effect = EXCLUDED.effect
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM ins;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION auth.fn_rbac__copy_user_access(uuid, uuid) TO auth_user;

-- Members of the caller's current tenant, for the UserAccessManager list. SECURITY DEFINER
-- (an admin has no blanket SELECT on other users' user_data) but hard-gated on tenant_member.manage.
CREATE OR REPLACE FUNCTION auth.fn_rbac__tenant_users()
RETURNS TABLE (
  user_id      uuid,
  display_name text,
  full_name    text,
  email        text,
  role_id      bigint,
  is_root      boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  v_tenant uuid := auth.fun_auth_current_tenant_id();
BEGIN
  IF NOT auth.fun_auth_has_perm('tenant_member', 'manage') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT
    ur.user_id,
    ud.display_name::text,
    ud.full_name::text,
    ud.email::text,
    ur.role_id,
    COALESCE(u.is_root, false)
  FROM auth.user_roles ur
  JOIN auth.users u ON u.uid = ur.user_id
  LEFT JOIN public.user_data ud ON ud.user_id = ur.user_id AND ud.tenant_id = v_tenant
  WHERE ur.tenant_id = v_tenant
  ORDER BY COALESCE(ud.display_name, ud.full_name, ur.user_id::text);
END;
$$;

GRANT EXECUTE ON FUNCTION auth.fn_rbac__tenant_users() TO auth_user;

NOTIFY pgrst, 'reload schema';
