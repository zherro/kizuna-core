-- plugins/system_config/0001_system_config.sql
-- Optional. Depends only on core (auth.users, auth.fun_auth_has_perm()). Generic key/value
-- config bag any plugin, or a consuming project's own feature, can read/write against — the
-- mechanism (one jsonb value per text key) is generic; the actual keys that exist and the shape
-- of their jsonb value are a project's own business decision, not this table's concern (e.g.
-- foco-total's db/extras/system_config_seed.sql seeds `user_data.document_field`/
-- `user_data.birth_date_field` for the user_data plugin's onboarding form — nothing about those
-- key names or shapes lives here).
--
-- Read-open to any session (auth_user, anon) — the app needs to read it to render a form
-- correctly (e.g. whether a field is required before the user even logs in to an onboarding
-- flow), and a config flag/text isn't sensitive data. Writes gated by system_config.manage —
-- nobody granted it by default, root already passes via the auth.fun_auth_has_perm is_root
-- bypass (see plugins/README.md convention).

CREATE TABLE IF NOT EXISTS auth.system_config (
    key         text PRIMARY KEY,
    value       jsonb NOT NULL,
    updated_by  uuid REFERENCES auth.users(uid),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE auth.system_config ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE auth.system_config TO auth_user, anon;
GRANT INSERT, UPDATE, DELETE ON TABLE auth.system_config TO auth_user;

DROP POLICY IF EXISTS system_config_select_policy ON auth.system_config;
CREATE POLICY system_config_select_policy ON auth.system_config FOR SELECT TO auth_user, anon
USING (true);

-- Writes gated by the system_config.manage permission (registered below). Nobody is granted it
-- by default — see plugins/README.md convention; root already passes this check via
-- auth.fun_auth_has_perm's is_root bypass, no role_grants row needed.
DROP POLICY IF EXISTS system_config_insert_policy ON auth.system_config;
CREATE POLICY system_config_insert_policy ON auth.system_config FOR INSERT TO auth_user
WITH CHECK (auth.fun_auth_has_perm('system_config', 'manage'));

DROP POLICY IF EXISTS system_config_update_policy ON auth.system_config;
CREATE POLICY system_config_update_policy ON auth.system_config FOR UPDATE TO auth_user
USING (auth.fun_auth_has_perm('system_config', 'manage'))
WITH CHECK (auth.fun_auth_has_perm('system_config', 'manage'));

DROP POLICY IF EXISTS system_config_delete_policy ON auth.system_config;
CREATE POLICY system_config_delete_policy ON auth.system_config FOR DELETE TO auth_user
USING (auth.fun_auth_has_perm('system_config', 'manage'));

-- Plugin registration + RBAC wiring (see plugins/README.md convention). system_config.manage is
-- registered in the catalog only — no role gets it automatically. Root already passes
-- auth.fun_auth_has_perm for it via the is_root bypass; granting it to a tenant role (or any
-- other role) is left to whoever installs/administers the consuming project.
INSERT INTO auth.permissions (resource, action, name)
VALUES ('system_config', 'manage', 'Gerenciar configurações do sistema')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('system_config', '1.0.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
