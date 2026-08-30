-- 0106_wire_rbac_into_login.sql
-- Root-cause fix: the RBAC tables introduced in 0101 (auth.permissions, auth.role_grants,
-- auth.user_tenant_permissions, auth.users.is_root) were never read by the login path.
-- auth.fun_auth_has_perm() (0102) reads `perms`/`is_root` from the JWT claims, but those claims
-- are built by auth.get_auth__effective_permissions() (0009) and auth.fun_auth__login_with_perms()
-- (0010) — neither had been updated to look at the new tables. A grant in auth.role_grants had
-- zero effect on what a user actually logs in with. This file connects the wire.
--
-- Additive only, same philosophy as 0101/0103/0105: the three legacy jsonb sources
-- (auth.tenant_role_permissions, auth.role_permissions, auth.group_permissions) stay exactly as
-- they were and keep contributing to the result. This CREATE OR REPLACE adds two new sources on
-- top of them:
--   1. auth.role_grants (joined through auth.permissions to get resource/action) for every role
--      the user holds in the current tenant — not gated by is_admin, unlike the legacy
--      tenant_role_permissions branch, because role_grants is meant to work for any role,
--      including tenant-owned custom roles.
--   2. auth.user_tenant_permissions with effect='allow', merged the same way.
-- auth.user_tenant_permissions with effect='deny' is NOT merged via bool_or (a plain OR would let
-- a `true` from any other source win over a deny, which is backwards) — it is applied as a final
-- subtraction pass after every other source has been aggregated, so deny always wins regardless of
-- how many allow sources agree otherwise.

CREATE OR REPLACE FUNCTION auth.get_auth__effective_permissions()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = auth, public
AS $function$
WITH ctx AS (
    SELECT
        auth.fun_auth_user_id()          AS uid,
        auth.fun_auth_current_tenant_id() AS tid
),
is_admin AS (
    SELECT EXISTS (
        SELECT 1
        FROM auth.user_roles ur, ctx
        WHERE ur.user_id = ctx.uid
          AND ur.tenant_id = ctx.tid
          AND ur.role_id = 2
    ) AS admin
),
role_id AS (
    SELECT ur.role_id
    FROM auth.user_roles ur, ctx
    WHERE ur.user_id = ctx.uid
      AND ur.tenant_id = ctx.tid
),
src AS (
    -- Admin: overrides por tenant + defaults globais + grupos (legacy jsonb sources, unchanged)
    SELECT rp_t.resource, rp_t.permissions
    FROM auth.tenant_role_permissions rp_t, ctx, is_admin, role_id
    WHERE is_admin.admin = true
      AND rp_t.tenant_id = ctx.tid
      AND rp_t.role_id =  role_id.role_id

    UNION ALL

    SELECT rp_g.resource, rp_g.permissions
    FROM auth.role_permissions rp_g, role_id
    WHERE rp_g.role_id = role_id.role_id

    UNION ALL

    -- Grupos (admin e nao-admin)
    SELECT gp.resource, gp.permissions
    FROM auth.user_groups ug
    JOIN auth.group_permissions gp
      ON gp.tenant_id = ug.tenant_id
     AND gp.group_id  = ug.group_id,
         ctx
    WHERE ug.user_id  = ctx.uid
      AND ug.tenant_id = ctx.tid

    UNION ALL

    -- NEW (0106): normalized role_grants for every role the user holds in this tenant.
    -- Not gated by is_admin — applies to any role, including tenant-owned custom roles.
    SELECT p.resource, jsonb_build_object(p.action, true) AS permissions
    FROM auth.role_grants rg
    JOIN auth.permissions p ON p.id = rg.permission_id
    JOIN role_id ON role_id.role_id = rg.role_id

    UNION ALL

    -- NEW (0106): per-user, per-tenant allow overrides.
    SELECT p.resource, jsonb_build_object(p.action, true) AS permissions
    FROM auth.user_tenant_permissions utp
    JOIN auth.permissions p ON p.id = utp.permission_id, ctx
    WHERE utp.user_id = ctx.uid
      AND utp.tenant_id = ctx.tid
      AND utp.effect = 'allow'
),
flat AS (
    SELECT
        resource,
        key AS action,
        (perm ->> key)::boolean AS allowed
    FROM src AS s(resource, perm),
         LATERAL jsonb_object_keys(perm) AS key
),
agg AS (
    SELECT
        resource,
        action,
        bool_or(allowed) AS allowed
    FROM flat
    GROUP BY resource, action
),
-- NEW (0106): per-user, per-tenant deny overrides. Applied as a subtraction pass, not merged into
-- `agg` via bool_or, so a deny always wins regardless of how many allow sources agree otherwise.
denies AS (
    SELECT p.resource, p.action
    FROM auth.user_tenant_permissions utp
    JOIN auth.permissions p ON p.id = utp.permission_id, ctx
    WHERE utp.user_id = ctx.uid
      AND utp.tenant_id = ctx.tid
      AND utp.effect = 'deny'
),
agg_with_denies AS (
    SELECT
        a.resource,
        a.action,
        (a.allowed AND NOT EXISTS (
            SELECT 1 FROM denies d WHERE d.resource = a.resource AND d.action = a.action
        )) AS allowed
    FROM agg a

    UNION ALL

    -- A deny on an action no allow source ever granted still needs to surface explicitly as
    -- false, so an override always shows up in the returned map even from a clean baseline.
    SELECT d.resource, d.action, false AS allowed
    FROM denies d
    WHERE NOT EXISTS (SELECT 1 FROM agg a2 WHERE a2.resource = d.resource AND a2.action = d.action)
),
by_resource AS (
    SELECT
        resource,
        jsonb_object_agg(action, allowed) AS perms
    FROM agg_with_denies
    GROUP BY resource
)
SELECT COALESCE(
               jsonb_object_agg(resource, perms),
               '{}'::jsonb
       )
FROM by_resource;
$function$;

GRANT USAGE ON SCHEMA auth TO anon, auth_user;
GRANT EXECUTE ON FUNCTION auth.get_auth__effective_permissions() TO anon, auth_user;

-- fun_auth__login_with_perms (0010) built claims without `is_root`, so auth.fun_auth_has_perm()
-- (0102) — which reads `is_root` straight off the JWT — always saw it as absent/false for anyone
-- who logged in through the normal login path (only fun_auth__switch_tenant/root_enter_tenant
-- included it). Same signature, same flow, adds is_root to both the claims set via set_config and
-- the jsonb returned to the caller. Also pins SET search_path (defense in depth for a
-- SECURITY DEFINER function, same pattern as 0102/0105).
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
