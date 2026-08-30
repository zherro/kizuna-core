-- 0108_plugin_registry.sql
-- Tracking table for optional plugins applied from kizuna-core/plugins/*/0001_*.sql. Lives in
-- `auth` (same schema as the rest of identity/RBAC infra, not `public`) because plugin identity —
-- "is X installed, at what version" — is core bookkeeping, not domain data. Kept deliberately
-- minimal (name/version/installed_at); a plugin needing more should add its own table, not grow
-- this one.
--
-- Convention (documented in plugins/README.md): every plugin's 0001_*.sql inserts its own row here
-- at the end (ON CONFLICT DO UPDATE on version, so re-applying an upgraded plugin file updates the
-- recorded version) and — when the plugin has anything an admin should be able to manage — inserts
-- its permissions into auth.permissions and grants them to the global ADMIN role (role_id = 2) via
-- auth.role_grants, both idempotent (ON CONFLICT DO NOTHING).
--
-- Writes are intentionally not granted to auth_user: a plugin registers itself when its SQL file is
-- applied by whoever runs migrations (superuser/migration role), not through the API at runtime.
-- Reads are open (anon + auth_user) since "which plugins are installed" is not sensitive.

CREATE TABLE IF NOT EXISTS auth.plugin_registry (
    name         text PRIMARY KEY,
    version      text NOT NULL DEFAULT '1.0.0',
    installed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE auth.plugin_registry ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE auth.plugin_registry TO auth_user, anon;
DROP POLICY IF EXISTS plugin_registry_select_policy ON auth.plugin_registry;
CREATE POLICY plugin_registry_select_policy ON auth.plugin_registry FOR SELECT TO auth_user, anon USING (true);

NOTIFY pgrst, 'reload schema';
