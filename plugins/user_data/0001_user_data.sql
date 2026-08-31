-- plugins/user_data/0001_user_data.sql
-- Optional. Depends only on core (auth.users, auth.tenants, auth.fun_auth_user_id(),
-- auth.fun_auth_current_tenant_id()). Skip entirely if a project doesn't need a profile table.
-- Trimmed from foco-total's live version: dropped the dead bytea `avatar` column (superseded by
-- avatar_url), dropped onboarding_done/status (foco-total business meaning, not generic), and
-- made document_type/document_number nullable (KYC is a vertical-specific requirement, not core —
-- a project needing it enforces NOT NULL itself, e.g. via a resource config's requiredFields).
-- email_verification_code ships here too (not trimmed): the column always exists — whether a
-- project actually uses it (requires an email-verification step or not) is an application-level
-- decision, not a schema one. Same principle as document_type/birth_date being nullable: the core
-- table doesn't decide what's required or visible, `system_config` (or a project's own logic)
-- does.
--
-- `avatar_url` is just a URL string — no FK to any file-storage table, so nothing here forces
-- installing the `storage` plugin. But it's a soft, functional dependency: a project that lets
-- users upload an avatar (as foco-total's user-data form does, via `/api/storage/files`) needs
-- `storage` installed too, or every upload fails with "permission denied for table files" (no
-- plugin ever GRANTed `auth_user` access to it). See `plugins/storage/0001_storage.sql`.

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
    email_verification_code character varying(10),
    active           boolean NOT NULL DEFAULT true,
    created_by       uuid NOT NULL DEFAULT auth.fun_auth_user_id(),
    created_at       timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_data_uid_unique UNIQUE (uid),
    CONSTRAINT user_data_user_id_unique UNIQUE (user_id)
);

-- `display_name` doubles as the public profile slug (/prestador/<display_name>), so it must be
-- unique — case-insensitively, so "Joao" and "joao" can't collide as two different URLs. Partial
-- (WHERE display_name IS NOT NULL) since the column itself stays optional at the schema level; a
-- consuming app that requires it (as foco-total's form does) enforces that in its own validation.
CREATE UNIQUE INDEX IF NOT EXISTS user_data_display_name_unique_idx
  ON public.user_data (lower(display_name))
  WHERE display_name IS NOT NULL;

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

-- fn_get_provider_profile — public-safe subset of user_data for a public profile page. RLS above
-- only lets a user read their own row (`uid = auth.fun_auth_user_id()`), so anon has no way to
-- read anyone else's profile directly — a project showing a public profile page needs a
-- SECURITY DEFINER function with an explicit whitelisted column list (never `SELECT *`) so an
-- anonymous visitor reads exactly these fields and nothing else (no document number, phone,
-- email, or any other private column). Bundled in this plugin (not left to each consuming project
-- to reinvent) because it's a direct, generic consequence of the RLS policy this same file sets.
DROP FUNCTION IF EXISTS public.fn_get_provider_profile(uuid);

CREATE OR REPLACE FUNCTION public.fn_get_provider_profile(p_user_id uuid)
 RETURNS TABLE(
   user_id uuid,
   full_name character varying,
   display_name character varying,
   avatar_url character varying,
   bio text,
   city character varying,
   state character varying
 )
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT ud.user_id, ud.full_name, ud.display_name, ud.avatar_url, ud.bio, ud.city, ud.state
  FROM public.user_data ud
  WHERE ud.user_id = p_user_id
    AND ud.active = true
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_provider_profile(uuid) TO anon, auth_user;

-- Same lookup, keyed by the public slug (`display_name`) instead of the internal `user_id` — what
-- `/prestador/<slug>` actually has in the URL. Overloaded under the same name (Postgres dispatches
-- by argument type), so callers pick whichever identifier they have on hand.
DROP FUNCTION IF EXISTS public.fn_get_provider_profile(text);

CREATE OR REPLACE FUNCTION public.fn_get_provider_profile(p_display_name text)
 RETURNS TABLE(
   user_id uuid,
   full_name character varying,
   display_name character varying,
   avatar_url character varying,
   bio text,
   city character varying,
   state character varying
 )
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT ud.user_id, ud.full_name, ud.display_name, ud.avatar_url, ud.bio, ud.city, ud.state
  FROM public.user_data ud
  WHERE lower(ud.display_name) = lower(p_display_name)
    AND ud.active = true
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_get_provider_profile(text) TO anon, auth_user;

NOTIFY pgrst, 'reload schema';
