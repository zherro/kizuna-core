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
-- No DELETE — no plugin does physical delete (see plugins/README.md). Removing a step is a soft
-- delete (`active = false`), already covered by the UPDATE grant/policy below. The REVOKE strips
-- DELETE back off an install from before this change.
GRANT SELECT, INSERT, UPDATE ON TABLE public.onboarding_steps TO auth_user;
REVOKE DELETE ON TABLE public.onboarding_steps FROM auth_user;
-- `id bigserial` — same sequence-grant gap as onboarding_progress below; without it any INSERT
-- (gated by onboarding_steps.manage, but still executed as auth_user) 42501s on nextval().
GRANT USAGE, SELECT ON SEQUENCE public.onboarding_steps_id_seq TO auth_user;
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
-- No longer created — physical delete is disallowed (see the GRANT note above).
DROP POLICY IF EXISTS onboarding_steps_delete_policy ON public.onboarding_steps;

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
-- `id bigserial` backs its DEFAULT with nextval() on onboarding_progress_id_seq — granting only
-- the table is not enough, Postgres separately checks USAGE/SELECT on the sequence for any INSERT
-- that relies on that default, otherwise every insert 42501s with "permission denied for sequence".
GRANT USAGE, SELECT ON SEQUENCE public.onboarding_progress_id_seq TO auth_user;
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

-- fn_is_onboarding_completed — core feature of this plugin, not foco-total-specific: any project
-- consuming the onboarding plugin needs to answer "has the current user finished every required
-- step?" (gating a wizard, showing a banner, etc.), so it ships here instead of being reinvented
-- per project. No args — always evaluates against the calling user (auth.fun_auth_user_id()), so
-- it's callable both as a PostgREST RPC and from inside other functions/policies in this schema.
-- Not SECURITY DEFINER: RLS on onboarding_steps (readable to any auth_user) and onboarding_progress
-- (only the owning user's rows) already scopes this correctly for the invoker.
DROP FUNCTION IF EXISTS public.fn_is_onboarding_completed();

CREATE OR REPLACE FUNCTION public.fn_is_onboarding_completed()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    v_required_steps integer;
    v_completed_steps integer;
BEGIN

    -- Total de etapas obrigatórias
    SELECT COUNT(*)
    INTO v_required_steps
    FROM public.onboarding_steps os
    WHERE os.is_required = true;

    -- Etapas obrigatórias concluídas pelo usuário
    SELECT COUNT(DISTINCT op.step_id)
    INTO v_completed_steps
    FROM public.onboarding_progress op
    INNER JOIN public.onboarding_steps os
        ON os.id = op.step_id
    WHERE op.status = 'completed'
      AND os.is_required = true
      AND op.user_id = auth.fun_auth_user_id();

    RETURN v_completed_steps = v_required_steps;

END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_is_onboarding_completed() TO auth_user;

NOTIFY pgrst, 'reload schema';
