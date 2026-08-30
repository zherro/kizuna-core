-- 0103_seed_and_backfill.sql
-- Backfills auth.permissions from every resource/action pair already live in the jsonb-based
-- role_permissions and group_permissions tables, then mirrors role_permissions' grants into
-- role_grants for the global roles. group_permissions is tenant-scoped and is migrated per-tenant
-- into custom roles by a later cutover migration, not here.

INSERT INTO auth.permissions (resource, action, name)
SELECT DISTINCT resource, action, resource || ' - ' || action
FROM (
  SELECT resource, jsonb_object_keys(permissions) AS action FROM auth.role_permissions
  UNION
  SELECT resource, jsonb_object_keys(permissions) AS action FROM auth.group_permissions
) all_actions
ON CONFLICT (resource, action) DO NOTHING;

-- Ensure the two global template roles exist and are marked global (tenant_id NULL is already
-- the default from 0101's ALTER — this just guards a re-run finding them missing).
INSERT INTO auth.roles (id, uid, name, code)
VALUES (2, gen_random_uuid(), 'ADMIN', 'ADMIN')
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.roles (id, uid, name, code)
VALUES (3, gen_random_uuid(), 'USER', 'USER')
ON CONFLICT (id) DO NOTHING;
-- USER intentionally gets no role_grants rows — see spec section 3.

-- Mirror role_permissions (jsonb) into role_grants (normalized) for every role that has one.
INSERT INTO auth.role_grants (role_id, permission_id)
SELECT rp.role_id, p.id
FROM auth.role_permissions rp
JOIN LATERAL jsonb_each(rp.permissions) AS kv(action, allowed) ON true
JOIN auth.permissions p ON p.resource = rp.resource AND p.action = kv.action
WHERE (kv.allowed)::text::boolean = true
ON CONFLICT DO NOTHING;
