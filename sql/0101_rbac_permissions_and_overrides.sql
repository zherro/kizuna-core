-- 0101_rbac_permissions_and_overrides.sql
-- Additive only. Old auth.role_permissions (jsonb) and auth.groups/group_permissions/user_groups
-- stay untouched and live until a future cutover migration retires them — see
-- docs/superpowers/specs/2026-08-30-kizuna-auth-model-design.md, section 9.

ALTER TABLE auth.users   ADD COLUMN IF NOT EXISTS is_root boolean NOT NULL DEFAULT false;
ALTER TABLE auth.tenants ADD COLUMN IF NOT EXISTS active  boolean NOT NULL DEFAULT true;
ALTER TABLE auth.roles   ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES auth.tenants(uid) ON DELETE RESTRICT;
ALTER TABLE auth.roles   ADD COLUMN IF NOT EXISTS code text;

CREATE TABLE IF NOT EXISTS auth.permissions (
    id          bigserial PRIMARY KEY,
    resource    text NOT NULL,
    action      text NOT NULL,
    code        text GENERATED ALWAYS AS (resource || '_' || action) STORED,
    name        text,
    description text,
    CONSTRAINT permissions_resource_action_unique UNIQUE (resource, action)
);

ALTER TABLE auth.permissions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE auth.permissions TO auth_user, anon;
DROP POLICY IF EXISTS permissions_select_policy ON auth.permissions;
CREATE POLICY permissions_select_policy ON auth.permissions FOR SELECT TO auth_user, anon USING (true);

CREATE TABLE IF NOT EXISTS auth.role_grants (
    role_id       bigint NOT NULL REFERENCES auth.roles(id) ON DELETE RESTRICT,
    permission_id bigint NOT NULL REFERENCES auth.permissions(id) ON DELETE RESTRICT,
    CONSTRAINT role_grants_pkey PRIMARY KEY (role_id, permission_id)
);

ALTER TABLE auth.role_grants ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE auth.role_grants TO auth_user;
DROP POLICY IF EXISTS role_grants_select_policy ON auth.role_grants;
CREATE POLICY role_grants_select_policy ON auth.role_grants FOR SELECT TO auth_user USING (true);
-- Write requires the role to be a tenant-owned custom role (tenant_id NOT NULL) matching the
-- caller's current tenant — global template roles (ADMIN/USER, tenant_id NULL) are seed-managed,
-- not editable via the API in v1.
DROP POLICY IF EXISTS role_grants_write_policy ON auth.role_grants;
CREATE POLICY role_grants_write_policy ON auth.role_grants FOR ALL TO auth_user
USING (
  EXISTS (
    SELECT 1 FROM auth.roles r
    WHERE r.id = role_grants.role_id
      AND r.tenant_id IS NOT NULL
      AND r.tenant_id = auth.fun_auth_current_tenant_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.roles r
    WHERE r.id = role_grants.role_id
      AND r.tenant_id IS NOT NULL
      AND r.tenant_id = auth.fun_auth_current_tenant_id()
  )
);

CREATE TABLE IF NOT EXISTS auth.user_tenant_permissions (
    user_id       uuid NOT NULL REFERENCES auth.users(uid) ON DELETE RESTRICT,
    tenant_id     uuid NOT NULL REFERENCES auth.tenants(uid) ON DELETE RESTRICT,
    permission_id bigint NOT NULL REFERENCES auth.permissions(id) ON DELETE RESTRICT,
    effect        text NOT NULL CHECK (effect IN ('allow', 'deny')),
    CONSTRAINT user_tenant_permissions_pkey PRIMARY KEY (user_id, tenant_id, permission_id)
);

ALTER TABLE auth.user_tenant_permissions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE auth.user_tenant_permissions TO auth_user;
DROP POLICY IF EXISTS utp_select_policy ON auth.user_tenant_permissions;
CREATE POLICY utp_select_policy ON auth.user_tenant_permissions FOR SELECT TO auth_user
USING (tenant_id = auth.fun_auth_current_tenant_id() OR user_id = auth.fun_auth_user_id());
DROP POLICY IF EXISTS utp_write_policy ON auth.user_tenant_permissions;
CREATE POLICY utp_write_policy ON auth.user_tenant_permissions FOR ALL TO auth_user
USING (tenant_id = auth.fun_auth_current_tenant_id())
WITH CHECK (tenant_id = auth.fun_auth_current_tenant_id());

CREATE TABLE IF NOT EXISTS auth.root_access_log (
    id            bigserial PRIMARY KEY,
    root_user_id  uuid NOT NULL REFERENCES auth.users(uid),
    tenant_id     uuid NOT NULL REFERENCES auth.tenants(uid),
    reason        text NOT NULL,
    entered_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE auth.root_access_log ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON TABLE auth.root_access_log TO auth_user;
DROP POLICY IF EXISTS root_access_log_select_policy ON auth.root_access_log;
CREATE POLICY root_access_log_select_policy ON auth.root_access_log FOR SELECT TO auth_user
USING (root_user_id = auth.fun_auth_user_id());
DROP POLICY IF EXISTS root_access_log_insert_policy ON auth.root_access_log;
CREATE POLICY root_access_log_insert_policy ON auth.root_access_log FOR INSERT TO auth_user
WITH CHECK (root_user_id = auth.fun_auth_user_id());

NOTIFY pgrst, 'reload schema';
