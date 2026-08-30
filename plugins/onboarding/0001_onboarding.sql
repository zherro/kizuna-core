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
GRANT SELECT ON TABLE public.onboarding_steps TO auth_user;
DROP POLICY IF EXISTS onboarding_steps_select_policy ON public.onboarding_steps;
CREATE POLICY onboarding_steps_select_policy ON public.onboarding_steps FOR SELECT TO auth_user
USING (true);

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

NOTIFY pgrst, 'reload schema';
