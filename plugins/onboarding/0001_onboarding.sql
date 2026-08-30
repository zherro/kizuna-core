-- plugins/onboarding/0001_onboarding.sql
-- Optional. Mechanism only — no steps are seeded here, each project inserts its own
-- onboarding_steps rows (per role, if roles matter to it). Depends only on core.

CREATE TABLE IF NOT EXISTS public.onboarding_steps (
    id           bigserial PRIMARY KEY,
    uid          uuid NOT NULL DEFAULT gen_random_uuid(),
    name         text NOT NULL,
    slug         text NOT NULL,
    description  text,
    role         text,
    step_order   integer NOT NULL DEFAULT 0,
    is_required  boolean NOT NULL DEFAULT true,
    active       boolean NOT NULL DEFAULT true,
    created_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT onboarding_steps_uid_unique UNIQUE (uid),
    CONSTRAINT onboarding_steps_slug_unique UNIQUE (slug)
);

ALTER TABLE public.onboarding_steps ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.onboarding_steps TO auth_user;
DROP POLICY IF EXISTS onboarding_steps_select_policy ON public.onboarding_steps;
CREATE POLICY onboarding_steps_select_policy ON public.onboarding_steps FOR SELECT TO auth_user
USING (true);
-- Writes gated by the onboarding_steps.manage permission (registered below). Nobody is granted
-- it by default — see plugins/README.md convention; root already passes this check via
-- auth.fun_auth_has_perm's is_root bypass, no role_grants row needed.
DROP POLICY IF EXISTS onboarding_steps_insert_policy ON public.onboarding_steps;
CREATE POLICY onboarding_steps_insert_policy ON public.onboarding_steps FOR INSERT TO auth_user
WITH CHECK (auth.fun_auth_has_perm('onboarding_steps', 'manage'));
DROP POLICY IF EXISTS onboarding_steps_update_policy ON public.onboarding_steps;
CREATE POLICY onboarding_steps_update_policy ON public.onboarding_steps FOR UPDATE TO auth_user
USING (auth.fun_auth_has_perm('onboarding_steps', 'manage'))
WITH CHECK (auth.fun_auth_has_perm('onboarding_steps', 'manage'));
DROP POLICY IF EXISTS onboarding_steps_delete_policy ON public.onboarding_steps;
CREATE POLICY onboarding_steps_delete_policy ON public.onboarding_steps FOR DELETE TO auth_user
USING (auth.fun_auth_has_perm('onboarding_steps', 'manage'));

CREATE TABLE IF NOT EXISTS public.onboarding_progress (
    id            bigserial PRIMARY KEY,
    uid           uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id       uuid NOT NULL REFERENCES auth.users(uid) ON DELETE RESTRICT,
    step_id       bigint NOT NULL REFERENCES public.onboarding_steps(id) ON DELETE RESTRICT,
    status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
    completed_at  timestamptz,
    metadata      jsonb,
    tenant_id     uuid NOT NULL DEFAULT auth.fun_auth_current_tenant_id() REFERENCES auth.tenants(uid) ON DELETE RESTRICT,
    created_by    uuid NOT NULL DEFAULT auth.fun_auth_user_id(),
    created_at    timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT onboarding_progress_uid_unique UNIQUE (uid),
    CONSTRAINT onboarding_progress_user_step_unique UNIQUE (user_id, step_id)
);

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON TABLE public.onboarding_progress TO auth_user;
DROP POLICY IF EXISTS onboarding_progress_select_policy ON public.onboarding_progress;
CREATE POLICY onboarding_progress_select_policy ON public.onboarding_progress FOR SELECT TO auth_user
USING (user_id = auth.fun_auth_user_id());
DROP POLICY IF EXISTS onboarding_progress_insert_policy ON public.onboarding_progress;
CREATE POLICY onboarding_progress_insert_policy ON public.onboarding_progress FOR INSERT TO auth_user
WITH CHECK (user_id = auth.fun_auth_user_id());
DROP POLICY IF EXISTS onboarding_progress_update_policy ON public.onboarding_progress;
CREATE POLICY onboarding_progress_update_policy ON public.onboarding_progress FOR UPDATE TO auth_user
USING (user_id = auth.fun_auth_user_id())
WITH CHECK (user_id = auth.fun_auth_user_id());

-- Plugin registration + RBAC wiring (see plugins/README.md convention). onboarding_steps.manage
-- is registered in the catalog only — no role gets it automatically. Root already passes
-- auth.fun_auth_has_perm for it via the is_root bypass; granting it to a tenant role (or any
-- other role) is left to whoever installs/administers the consuming project. onboarding_progress
-- stays self-service only (no admin permission — a user's own progress isn't something an admin
-- edits here).
INSERT INTO auth.permissions (resource, action, name)
VALUES ('onboarding_steps', 'manage', 'Gerenciar etapas de onboarding')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('onboarding', '1.0.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
