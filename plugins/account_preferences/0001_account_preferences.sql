-- plugins/account_preferences/0001_account_preferences.sql
-- Optional. One flexible jsonb bag of per-user, per-tenant app settings (theme, locale,
-- notification opt-ins, whatever a project needs) instead of a rigid column per setting.

CREATE TABLE IF NOT EXISTS public.account_preferences (
    user_id      uuid NOT NULL REFERENCES auth.users(uid) ON DELETE RESTRICT,
    tenant_id    uuid NOT NULL DEFAULT auth.fun_auth_current_tenant_id() REFERENCES auth.tenants(uid) ON DELETE RESTRICT,
    preferences  jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT account_preferences_pkey PRIMARY KEY (user_id, tenant_id)
);

ALTER TABLE public.account_preferences ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON TABLE public.account_preferences TO auth_user;
DROP POLICY IF EXISTS account_preferences_policy ON public.account_preferences;
CREATE POLICY account_preferences_policy ON public.account_preferences FOR ALL TO auth_user
USING (user_id = auth.fun_auth_user_id())
WITH CHECK (user_id = auth.fun_auth_user_id());

-- Plugin registration (see plugins/README.md convention). No permissions registered: this plugin
-- is strictly self-service (a user manages only their own preferences, no admin-facing action
-- exists over other users' rows), so there is nothing meaningful to gate behind RBAC.
INSERT INTO auth.plugin_registry (name, version)
VALUES ('account_preferences', '1.0.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
