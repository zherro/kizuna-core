-- plugins/user_data/0001_user_data.sql
-- Optional. Depends only on core (auth.users, auth.tenants, auth.fun_auth_user_id(),
-- auth.fun_auth_current_tenant_id()). Skip entirely if a project doesn't need a profile table.
-- Trimmed from foco-total's live version: dropped the dead bytea `avatar` column (superseded by
-- avatar_url), dropped email_verification_code (implementation-specific to one verification
-- flow), dropped onboarding_done/status (foco-total business meaning, not generic), and made
-- document_type/document_number nullable (KYC is a vertical-specific requirement, not core —
-- a project needing it enforces NOT NULL itself, e.g. via a resource config's requiredFields).

CREATE TABLE IF NOT EXISTS public.user_data (
    id               bigserial PRIMARY KEY,
    uid              uuid NOT NULL DEFAULT auth.fun_auth_user_id(),
    user_id          uuid NOT NULL REFERENCES auth.users(uid) ON DELETE RESTRICT,
    tenant_id        uuid NOT NULL DEFAULT auth.fun_auth_current_tenant_id() REFERENCES auth.tenants(uid) ON DELETE RESTRICT,
    full_name        character varying(255),
    display_name     character varying(100),
    avatar_url       character varying(500),
    bio              text,
    phone            character varying(30),
    phone_verified   boolean NOT NULL DEFAULT false,
    email            character varying(150),
    email_verified   boolean NOT NULL DEFAULT false,
    country          character varying(2) DEFAULT 'BR',
    state            character varying(2),
    city             character varying(100),
    zip_code         character varying(10),
    latitude         character varying,
    longitude        character varying,
    language         character varying(10) DEFAULT 'pt-BR',
    timezone         character varying(50) DEFAULT 'America/Sao_Paulo',
    document_type    character varying(10),
    document_number  character varying(20),
    birth_date       date,
    active           boolean NOT NULL DEFAULT true,
    created_by       uuid NOT NULL DEFAULT auth.fun_auth_user_id(),
    created_at       timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_data_uid_unique UNIQUE (uid),
    CONSTRAINT user_data_user_id_unique UNIQUE (user_id)
);

ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON TABLE public.user_data TO auth_user;
GRANT USAGE, SELECT ON SEQUENCE public.user_data_id_seq TO auth_user;

DROP POLICY IF EXISTS user_data_select_policy ON public.user_data;
CREATE POLICY user_data_select_policy ON public.user_data FOR SELECT TO auth_user
USING (uid = auth.fun_auth_user_id());

DROP POLICY IF EXISTS user_data_insert_policy ON public.user_data;
CREATE POLICY user_data_insert_policy ON public.user_data FOR INSERT TO auth_user
WITH CHECK (uid = auth.fun_auth_user_id());

DROP POLICY IF EXISTS user_data_update_policy ON public.user_data;
CREATE POLICY user_data_update_policy ON public.user_data FOR UPDATE TO auth_user
USING (uid = auth.fun_auth_user_id())
WITH CHECK (uid = auth.fun_auth_user_id());

-- Plugin registration (see plugins/README.md convention). No permissions registered: as trimmed
-- for kizuna-core (see header note above), this plugin ships strictly self-service RLS — no admin
-- override to view/edit another user's profile exists here. A project wanting an admin-facing
-- "manage any member's profile" capability should add a `user_data.manage` permission plus a
-- SELECT/UPDATE policy branch gated on auth.fun_auth_has_perm('user_data','manage') itself; that is
-- a product decision (how much of a member's profile an admin should see/edit), not implied by the
-- generic core table.
INSERT INTO auth.plugin_registry (name, version)
VALUES ('user_data', '1.0.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
