-- kizuna-core — migrations dos PLUGINS compiladas
-- GERADO de plugins/<n>/NNNN_*.sql para a lista de starter/kizuna.plugins.json.
-- NÃO edite à mão. Regenere: node bundle/build.mjs
-- Aplicar DEPOIS do core-schema.sql, em base LIMPA:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f bundle/plugins-schema.sql
-- `taxonomy` NÃO está aqui (ALTERa tabelas que só o schema do app cria).
-- Plugins: user_data, system_config, account_preferences, notifications, onboarding, storage, location, pages, holidays, agenda


-- ===================================================================
-- PLUGIN: user_data  (1 arquivo)
-- ===================================================================



-- ===================================================================
-- 0001_user_data.sql
-- ===================================================================

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


-- ===================================================================
-- PLUGIN: system_config  (1 arquivo)
-- ===================================================================



-- ===================================================================
-- 0001_system_config.sql
-- ===================================================================

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
-- No DELETE — no plugin does physical delete (see plugins/README.md). A key/value bag like this
-- has no natural soft-delete flag either (its PK *is* the key), so removing a key just isn't a
-- supported operation here: a project that stops using a key simply stops reading it.
GRANT INSERT, UPDATE ON TABLE auth.system_config TO auth_user;
REVOKE DELETE ON TABLE auth.system_config FROM auth_user;

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

-- No longer created — physical delete is disallowed (see the GRANT note above).
DROP POLICY IF EXISTS system_config_delete_policy ON auth.system_config;

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


-- ===================================================================
-- PLUGIN: account_preferences  (1 arquivo)
-- ===================================================================



-- ===================================================================
-- 0001_account_preferences.sql
-- ===================================================================

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


-- ===================================================================
-- PLUGIN: notifications  (1 arquivo)
-- ===================================================================



-- ===================================================================
-- 0001_notifications.sql
-- ===================================================================

-- plugins/notifications/0001_notifications.sql
-- Optional. Generic in-app notification feed ("bell icon" list). INSERT is deliberately NOT
-- granted to auth_user — notifications are pushed by trusted backend code (service role or a
-- SECURITY DEFINER function), never self-inserted by the recipient.

CREATE TABLE IF NOT EXISTS public.notifications (
    id           bigserial PRIMARY KEY,
    uid          uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES auth.users(uid) ON DELETE RESTRICT,
    tenant_id    uuid NOT NULL DEFAULT auth.fun_auth_current_tenant_id() REFERENCES auth.tenants(uid) ON DELETE RESTRICT,
    type         text NOT NULL,
    title        text NOT NULL,
    body         text,
    read_at      timestamptz,
    created_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT notifications_uid_unique UNIQUE (uid)
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON TABLE public.notifications TO auth_user;
DROP POLICY IF EXISTS notifications_select_policy ON public.notifications;
CREATE POLICY notifications_select_policy ON public.notifications FOR SELECT TO auth_user
USING (user_id = auth.fun_auth_user_id());
DROP POLICY IF EXISTS notifications_update_policy ON public.notifications;
CREATE POLICY notifications_update_policy ON public.notifications FOR UPDATE TO auth_user
USING (user_id = auth.fun_auth_user_id())
WITH CHECK (user_id = auth.fun_auth_user_id());

-- Plugin registration (see plugins/README.md convention). No permissions registered: rows are
-- pushed by trusted backend code only (never inserted by auth_user, see header note above), so
-- there is no admin-manageable action here to gate behind RBAC.
INSERT INTO auth.plugin_registry (name, version)
VALUES ('notifications', '1.0.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';


-- ===================================================================
-- PLUGIN: onboarding  (1 arquivo)
-- ===================================================================



-- ===================================================================
-- 0001_onboarding.sql
-- ===================================================================

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


-- ===================================================================
-- PLUGIN: storage  (1 arquivo)
-- ===================================================================



-- ===================================================================
-- 0001_storage.sql
-- ===================================================================

-- plugins/storage/0001_storage.sql
-- Optional. Depends only on core (auth.users, auth.tenants, auth.fun_auth_user_id(),
-- auth.fun_auth_current_tenant_id()) — no dependency on any other plugin.
--
-- Generic file storage: one row per uploaded file, content stored inline as `bytea` (no external
-- object storage integration here — a project needing S3/R2/etc. swaps the storage layer server
-- side, the table shape doesn't change). Used today by `getStorageService()`
-- (`kizuna-core/src/server/storage-service.ts`) for both authenticated upload/list/delete
-- (`/api/storage/files`) and anonymous content serving (`/api/public/storage/files/[id]/content`)
-- — e.g. a user's avatar or an ad's cover photo must be viewable by a visitor who isn't logged in
-- at all, which is why the SELECT policy below has an `anon` branch (active rows only), not just
-- an owner-only one.
--
-- Any plugin/project column that stores a reference to a file (e.g. `user_data.avatar_url`,
-- `services.cover_file_id`) just holds this table's `id` (or the public content URL built from
-- it) — there's no FK from those columns to `files.id`, so nothing SQL-level forces installing
-- this plugin. It's a soft, functional dependency instead: a project that wants avatar/ad-image
-- upload to actually work (not just fail with "permission denied for table files") needs this
-- plugin installed alongside whichever plugin owns that upload feature. See the note in
-- `plugins/user_data/0001_user_data.sql`.

CREATE TABLE IF NOT EXISTS public.files (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    uid              uuid NOT NULL DEFAULT auth.fun_auth_user_id(),
    tenant_id        uuid NOT NULL DEFAULT auth.fun_auth_current_tenant_id() REFERENCES auth.tenants(uid) ON DELETE RESTRICT,
    original_name    text,
    storage_path     text,
    public_url       text,
    mime_type        text,
    size_bytes       int,
    width            int,
    height           int,
    purpose          text DEFAULT 'other' CHECK (purpose IN (
      'ad_image', 'avatar', 'document', 'banner', 'pdf', 'doc', 'other'
    )),
    content          bytea,
    active           boolean NOT NULL DEFAULT true,
    created_at       timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Backfills defaults on a `files` table that already existed before this plugin (e.g.
-- foco-total's old `db/migrations/0001_initial_schema.sql`, which created the table with no
-- default on `uid`/`tenant_id` at all) — a no-op on a table this file just created itself, since
-- it already has the same defaults from the CREATE TABLE above.
ALTER TABLE public.files ALTER COLUMN uid SET DEFAULT auth.fun_auth_user_id();
ALTER TABLE public.files ALTER COLUMN tenant_id SET DEFAULT auth.fun_auth_current_tenant_id();
ALTER TABLE public.files ALTER COLUMN active SET DEFAULT true;
ALTER TABLE public.files ALTER COLUMN active SET NOT NULL;
ALTER TABLE public.files ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.files ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_files_uid ON public.files(uid);
CREATE INDEX IF NOT EXISTS idx_files_tenant_id ON public.files(tenant_id);
CREATE INDEX IF NOT EXISTS idx_files_purpose ON public.files(purpose);
CREATE INDEX IF NOT EXISTS idx_files_active ON public.files(active);

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- No DELETE grant — deletion is soft (`active = false` via PATCH, see `deleteFilePostgres` in
-- storage-service.ts), which only needs UPDATE.
GRANT SELECT, INSERT, UPDATE ON TABLE public.files TO auth_user;
-- Anon needs SELECT too — public content serving (`/api/public/storage/files/[id]/content`)
-- reads this table unauthenticated, restricted to active rows by the policy below.
GRANT SELECT ON TABLE public.files TO anon;

DROP POLICY IF EXISTS files_select_policy ON public.files;
CREATE POLICY files_select_policy ON public.files FOR SELECT TO auth_user
USING (uid = auth.fun_auth_user_id() OR active = true);

DROP POLICY IF EXISTS files_select_anon_policy ON public.files;
CREATE POLICY files_select_anon_policy ON public.files FOR SELECT TO anon
USING (active = true);

DROP POLICY IF EXISTS files_insert_policy ON public.files;
CREATE POLICY files_insert_policy ON public.files FOR INSERT TO auth_user
WITH CHECK (uid = auth.fun_auth_user_id());

DROP POLICY IF EXISTS files_update_policy ON public.files;
CREATE POLICY files_update_policy ON public.files FOR UPDATE TO auth_user
USING (uid = auth.fun_auth_user_id())
WITH CHECK (uid = auth.fun_auth_user_id());

-- Self-service only (each user manages their own uploads) — no admin-manage permission
-- registered. A project wanting "admin can delete anyone's file" adds a
-- `files.manage`-gated policy branch itself.
INSERT INTO auth.plugin_registry (name, version)
VALUES ('storage', '1.0.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';


-- ===================================================================
-- PLUGIN: location  (1 arquivo)
-- ===================================================================



-- ===================================================================
-- 0001_location.sql
-- ===================================================================

-- plugins/location/0001_location.sql
-- Optional. Generic geographic reference hierarchy: country -> region -> state -> city. Pure
-- reference data (no tenant/user ownership columns) — read-open to any session, no write access
-- granted to auth_user at all (not even self-service): this catalog is meant to be seeded once
-- (by an admin, or a project's own seed script) and never edited through the API. Same
-- "no write grant" shape as public.notifications' INSERT (see plugins/README.md), but here even
-- UPDATE/DELETE are withheld — nothing about this data is user- or tenant-editable.
--
-- Design notes:
-- 1) Deliberately country-agnostic in the schema: no "br"/"brasil" anywhere in table or column
--    names. Brazil-specific data (regions, states, cities) is a separate seed that lives in the
--    consuming project (foco-total's db/extras/location_seed_brazil.sql), not in this plugin.
-- 2) `location_region` sits between country and state — an explicit product decision to keep the
--    "grouping of states" level that already existed informally (Brazil's N/NE/SE/S/CO), now
--    properly scoped to a country via `country_id` instead of being implicit. `region_id` on
--    `location_state` is nullable because not every country's subdivision system has this middle
--    tier.
-- 3) `location_state` is the generic name for what Brazil calls "UF" (unidade federativa) — the
--    country-specific term doesn't belong in a generic schema.
-- 4) `location_state`/`location_city` use plain integer primary keys with NO generated default
--    (`id integer PRIMARY KEY`, not `serial`/`bigserial`) instead of the uuid surrogate keys most
--    other plugins use. This is deliberate: Brazil's own IBGE municipality/UF numeric codes are
--    stable, well-known natural keys, and reusing them verbatim as the primary key lets the
--    Brazil seed (db/extras/location_seed_brazil.sql) carry over 5000+ pre-existing city rows
--    from the old orphaned seed unchanged — no id remapping, no per-row subselect needed to
--    resolve `state_id`. Any other country seeded later either reuses its own official numeric
--    codes the same way, or picks arbitrary non-colliding integers — nothing in the schema
--    requires the id to mean anything.
-- 5) `location_city` keeps `microrregion_name`/`mesorregion_name` as nullable free-text columns
--    (dropping the `*_id` denormalized columns the old IBGE-sourced seed had, since nothing
--    references them by id) — real, already-available data kept at no schema cost, even though
--    the product only needs country/state/city today.
-- 6) No `auth.permissions` row and no RBAC gate: reference data with no admin-manageable action
--    behind it (see plugins/README.md convention — not every plugin needs one, e.g.
--    notifications has none either).

-- ---------------------------------------------------------------------------------------------
-- 1) location_country
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.location_country (
    id           uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    code         text NOT NULL,
    name         text NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT location_country_code_key UNIQUE (code)
);

-- ---------------------------------------------------------------------------------------------
-- 2) location_region — grouping level above state (e.g. Brazil's N/NE/SE/S/CO). See design note
--    2 above. Uses a plain integer id (no default) for the same "reuse the existing seed's ids
--    unchanged" reason as location_state/location_city (design note 4).
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.location_region (
    id           integer NOT NULL PRIMARY KEY,
    country_id   uuid NOT NULL REFERENCES public.location_country(id) ON DELETE CASCADE,
    code         text NOT NULL,
    name         text NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT location_region_country_code_key UNIQUE (country_id, code)
);

CREATE INDEX IF NOT EXISTS idx_location_region_country_id ON public.location_region(country_id);

-- ---------------------------------------------------------------------------------------------
-- 3) location_state — generic name for what Brazil calls "UF" (design note 3). region_id
--    nullable (design note 2). See design note 4 for why id is a plain integer with no default.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.location_state (
    id           integer NOT NULL PRIMARY KEY,
    country_id   uuid NOT NULL REFERENCES public.location_country(id) ON DELETE CASCADE,
    region_id    integer REFERENCES public.location_region(id) ON DELETE SET NULL,
    code         text NOT NULL,
    name         text NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT location_state_country_code_key UNIQUE (country_id, code)
);

CREATE INDEX IF NOT EXISTS idx_location_state_country_id ON public.location_state(country_id);
CREATE INDEX IF NOT EXISTS idx_location_state_region_id ON public.location_state(region_id);

-- ---------------------------------------------------------------------------------------------
-- 4) location_city — see design notes 4 and 5 for the id and denormalized-name column choices.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.location_city (
    id                   integer NOT NULL PRIMARY KEY,
    state_id             integer NOT NULL REFERENCES public.location_state(id) ON DELETE CASCADE,
    name                 text NOT NULL,
    microrregion_name    text,
    mesorregion_name     text,
    created_at           timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT location_city_state_name_key UNIQUE (state_id, name)
);

CREATE INDEX IF NOT EXISTS idx_location_city_state_id ON public.location_city(state_id);

-- ---------------------------------------------------------------------------------------------
-- 5) RLS. Read-open to any session (public reference data, same principle as taxonomy/holidays
--    catalogs). No write grant to auth_user at all — see header note. Root/service-role bypass
--    RLS entirely as usual, so seeding/administering this data directly against the database
--    (not through PostgREST) is unaffected.
-- ---------------------------------------------------------------------------------------------
ALTER TABLE public.location_country ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.location_country TO anon, auth_user;
DROP POLICY IF EXISTS location_country_select_policy ON public.location_country;
CREATE POLICY location_country_select_policy ON public.location_country FOR SELECT TO anon, auth_user
USING (true);

ALTER TABLE public.location_region ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.location_region TO anon, auth_user;
DROP POLICY IF EXISTS location_region_select_policy ON public.location_region;
CREATE POLICY location_region_select_policy ON public.location_region FOR SELECT TO anon, auth_user
USING (true);

ALTER TABLE public.location_state ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.location_state TO anon, auth_user;
DROP POLICY IF EXISTS location_state_select_policy ON public.location_state;
CREATE POLICY location_state_select_policy ON public.location_state FOR SELECT TO anon, auth_user
USING (true);

ALTER TABLE public.location_city ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.location_city TO anon, auth_user;
DROP POLICY IF EXISTS location_city_select_policy ON public.location_city;
CREATE POLICY location_city_select_policy ON public.location_city FOR SELECT TO anon, auth_user
USING (true);

-- Plugin registration (see plugins/README.md convention). No auth.permissions rows: reference
-- data, no admin-manageable action to gate (see header note 6).
INSERT INTO auth.plugin_registry (name, version)
VALUES ('location', '1.0.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';


-- ===================================================================
-- PLUGIN: pages  (2 arquivos)
-- ===================================================================



-- ===================================================================
-- 0001_pages.sql
-- ===================================================================

-- plugins/pages/0001_pages.sql
-- Optional. Depends only on core (auth.tenants, auth.fun_auth_current_tenant_id(),
-- auth.fun_auth_user_id(), auth.fun_auth_has_perm()). Does NOT ALTER any consuming-project
-- table, so it is safe to list in kizuna.plugins.json (unlike taxonomy).
--
-- Database-backed institutional / legal pages (about, terms, privacy, contact, ...), authored in
-- Markdown and server-rendered by the consuming app at `/[slug]`. Mirrors
-- plugins/onboarding/0001_onboarding.sql for the boilerplate (RLS on, REVOKE DELETE, sequence
-- grant, permission catalog-only, plugin_registry upsert, NOTIFY pgrst). Idempotent throughout.
--
-- NO seeding here (schema/RLS/RBAC only). Project-neutral default pages (sobre, quem-somos,
-- termos-de-uso) ship as a separate data file, 0002_pages_seed.sql, applied right after this one
-- by the installer. A consuming project can still add its own richer content on top
-- (e.g. foco-total's db/extras/pages_seed.sql).

CREATE TABLE IF NOT EXISTS public.pages (
    id           bigserial PRIMARY KEY,
    uid          uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id    uuid NOT NULL DEFAULT auth.fun_auth_current_tenant_id()
                 REFERENCES auth.tenants(uid) ON DELETE RESTRICT,
    slug         text NOT NULL,
    title        text NOT NULL,
    description  text,
    content      text NOT NULL DEFAULT '',
    status       text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    active       boolean NOT NULL DEFAULT true,
    created_by   uuid NOT NULL DEFAULT auth.fun_auth_user_id(),
    created_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pages_uid_unique UNIQUE (uid),
    CONSTRAINT pages_tenant_slug_unique UNIQUE (tenant_id, slug),
    CONSTRAINT pages_slug_format_check CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

-- Backfill defaults/constraints on a `pages` table that predates this file (no-op on a table
-- this file just created).
ALTER TABLE public.pages ALTER COLUMN tenant_id SET DEFAULT auth.fun_auth_current_tenant_id();
ALTER TABLE public.pages ALTER COLUMN created_by SET DEFAULT auth.fun_auth_user_id();
ALTER TABLE public.pages ALTER COLUMN content SET DEFAULT '';
ALTER TABLE public.pages ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE public.pages ALTER COLUMN active SET DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_pages_tenant_id ON public.pages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON public.pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_status ON public.pages(status);
CREATE INDEX IF NOT EXISTS idx_pages_active ON public.pages(active);

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- No DELETE — removing a page is a soft delete (`active = false`), covered by the UPDATE
-- grant/policy. The REVOKE strips DELETE off an install from before this file.
GRANT SELECT, INSERT, UPDATE ON TABLE public.pages TO auth_user;
REVOKE DELETE ON TABLE public.pages FROM auth_user;
-- Anon must be able to read a published page (logged-out visitor hitting `/[slug]`) — same
-- rationale as the storage plugin's anon-SELECT branch.
GRANT SELECT ON TABLE public.pages TO anon;
-- `id bigserial` DEFAULT calls nextval() on the sequence — Postgres checks USAGE/SELECT on the
-- sequence separately from the table grant, otherwise every INSERT 42501s.
GRANT USAGE, SELECT ON SEQUENCE public.pages_id_seq TO auth_user;

-- Anon: only published + active rows.
DROP POLICY IF EXISTS pages_select_anon_policy ON public.pages;
CREATE POLICY pages_select_anon_policy ON public.pages FOR SELECT TO anon
USING (active = true AND status = 'published');

-- Authenticated: any active row (authors/admins can see their own drafts too).
DROP POLICY IF EXISTS pages_select_policy ON public.pages;
CREATE POLICY pages_select_policy ON public.pages FOR SELECT TO auth_user
USING (active = true);

-- Writes gated by the pages.manage permission (registered below, catalog-only). Nobody gets it
-- automatically — root passes via auth.fun_auth_has_perm's is_root bypass; handing it to a
-- tenant role is left to whoever administers the consuming project.
DROP POLICY IF EXISTS pages_insert_policy ON public.pages;
CREATE POLICY pages_insert_policy ON public.pages FOR INSERT TO auth_user
WITH CHECK (auth.fun_auth_has_perm('pages', 'manage'));

DROP POLICY IF EXISTS pages_update_policy ON public.pages;
CREATE POLICY pages_update_policy ON public.pages FOR UPDATE TO auth_user
USING (auth.fun_auth_has_perm('pages', 'manage'))
WITH CHECK (auth.fun_auth_has_perm('pages', 'manage'));

DROP POLICY IF EXISTS pages_delete_policy ON public.pages;

-- Plugin registration + RBAC wiring (see plugins/README.md convention).
INSERT INTO auth.permissions (resource, action, name)
VALUES ('pages', 'manage', 'Gerenciar páginas')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('pages', '1.0.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';


-- ===================================================================
-- 0002_pages_seed.sql
-- ===================================================================

-- plugins/pages/0002_pages_seed.sql
--
-- Default institutional-pages seed, shipped WITH the `pages` plugin so a fresh install
-- isn't an empty site. The content here is deliberately project-neutral: it refers to
-- "a plataforma" / "nossa plataforma" and never names a real brand. A consuming project
-- is expected to edit these pages in the admin UI at `/painel/administracao/paginas`,
-- or to override them with its own seed (e.g. foco-total's db/extras/pages_seed.sql).
--
-- This file is DATA ONLY: it does not touch auth.plugin_registry / auth.permissions
-- (0001 already did that) and does not bump the plugin version.
--
-- Idempotent: re-running does not duplicate rows (ON CONFLICT ON CONSTRAINT
-- pages_tenant_slug_unique DO NOTHING).
--
-- Applied automatically right after 0001_pages.sql by the installer's widened
-- NNNN_*.sql glob (scripts/install.sh), which expands matches in filename order.
--
-- Tenant/user resolution: `pages.tenant_id` and `pages.created_by` are NOT NULL with
-- FKs. On a truly fresh DB there may be NO users/tenants yet at plugin-install time.
-- The INSERT below resolves the first root user and the tenant they own via
-- INNER `JOIN LATERAL (...) ON true`; when either subquery yields no row the join
-- produces zero rows and the whole INSERT is a silent no-op (never NULL into a NOT
-- NULL column, never an error).

INSERT INTO public.pages (slug, title, description, content, status, active, tenant_id, created_by)
SELECT
    v.slug,
    v.title,
    v.description,
    v.content,
    'published',
    true,
    t.uid,
    u.uid
FROM (VALUES
    (
        'sobre',
        'Sobre',
        'Conheça a plataforma, o que ela oferece e como ela funciona.',
        $md$# Sobre

Bem-vindo à nossa plataforma. Este é um espaço criado para conectar pessoas que
precisam de um serviço a profissionais e empresas prontos para atendê-las.

## O que oferecemos

A plataforma reúne, em um só lugar, anúncios de serviços de diferentes categorias.
Quem procura pode comparar opções, ver detalhes e entrar em contato diretamente com
quem oferece o serviço. Quem anuncia ganha visibilidade e novos clientes.

## Como funciona

- **Para quem procura:** navegue pelas categorias ou use a busca, abra os anúncios
  que chamarem sua atenção e fale com o anunciante.
- **Para quem anuncia:** crie sua conta, cadastre seus serviços com fotos e
  descrição, e acompanhe os contatos pelo painel.

## Nosso compromisso

Trabalhamos para manter um ambiente organizado, transparente e seguro, em que a
informação apresentada seja clara e as regras valham para todos. A plataforma está
em evolução contínua, e o retorno de quem a utiliza orienta cada melhoria.
$md$
    ),
    (
        'quem-somos',
        'Quem somos',
        'Nossa missão, nossos valores e a forma como pensamos a plataforma.',
        $md$# Quem somos

Somos uma equipe dedicada a facilitar o encontro entre quem precisa de um serviço e
quem sabe prestá-lo. Acreditamos que a tecnologia deve simplificar esse caminho, e
não complicá-lo.

## Nossa missão

Aproximar pessoas e negócios de forma simples, dando a profissionais de todos os
portes a chance de mostrar seu trabalho e a clientes a tranquilidade de escolher
bem.

## Nossos valores

- **Transparência:** informações claras, sem letras miúdas.
- **Respeito:** tratamos usuários, anunciantes e parceiros com a mesma consideração.
- **Simplicidade:** cada recurso existe para resolver um problema real.
- **Melhoria contínua:** ouvimos quem usa a plataforma e evoluímos a partir disso.

## Para onde vamos

Seguimos ampliando categorias, aperfeiçoando as ferramentas do painel e investindo
na qualidade da experiência, para que a plataforma seja a primeira opção de quem
procura e de quem oferece serviços.
$md$
    ),
    (
        'termos-de-uso',
        'Termos de uso',
        'As regras para utilização da plataforma e as responsabilidades de cada parte.',
        $md$# Termos de uso

Estes termos regulam o uso da plataforma. Ao acessá-la ou utilizá-la, você concorda
com as condições descritas abaixo. Recomendamos a leitura atenta deste documento.

## 1. Aceitação dos termos

O uso da plataforma implica a aceitação integral destes termos. Caso você não
concorde com qualquer disposição, não utilize os serviços oferecidos.

## 2. Cadastro e conta

Para utilizar determinados recursos é necessário criar uma conta, fornecendo
informações verdadeiras, completas e atualizadas. Você é responsável por manter a
confidencialidade de suas credenciais e por todas as atividades realizadas em sua
conta.

## 3. Uso da plataforma

A plataforma deve ser utilizada de forma lícita e de acordo com estes termos. É
vedado publicar conteúdo falso, enganoso, ofensivo ou que viole direitos de
terceiros, bem como tentar comprometer a segurança ou o funcionamento do serviço.

## 4. Responsabilidades

A plataforma atua como um espaço de conexão entre usuários e anunciantes. A
negociação, a contratação e a execução dos serviços ocorrem diretamente entre as
partes, que são as únicas responsáveis por seus atos, informações e compromissos
assumidos.

## 5. Propriedade intelectual

Marca, identidade visual, textos, layout e software da plataforma são protegidos e
não podem ser copiados, reproduzidos ou utilizados sem autorização prévia. O
conteúdo publicado por cada usuário permanece de sua responsabilidade.

## 6. Alterações nos termos

Estes termos podem ser atualizados a qualquer momento para refletir mudanças no
serviço ou na legislação aplicável. A versão vigente estará sempre disponível nesta
página, e o uso continuado da plataforma após alterações representa concordância com
o novo texto.

## 7. Contato

Em caso de dúvidas sobre estes termos, entre em contato pelos canais de atendimento
divulgados na plataforma.
$md$
    )
) AS v(slug, title, description, content)
JOIN LATERAL (
    SELECT uid FROM auth.users WHERE is_root = true ORDER BY created_at ASC LIMIT 1
) AS u(uid) ON true
JOIN LATERAL (
    SELECT tn.uid FROM auth.tenants tn WHERE tn.owner_uid = u.uid ORDER BY tn.created_at ASC LIMIT 1
) AS t(uid) ON true
ON CONFLICT ON CONSTRAINT pages_tenant_slug_unique DO NOTHING;

NOTIFY pgrst, 'reload schema';


-- ===================================================================
-- PLUGIN: holidays  (1 arquivo)
-- ===================================================================



-- ===================================================================
-- 0001_holidays.sql
-- ===================================================================

-- plugins/holidays/0001_holidays.sql
-- Optional. Depends only on core (auth.users, auth.tenants, auth.fun_auth_user_id(),
-- auth.fun_auth_current_tenant_id(), auth.fun_auth_has_perm()). Combo plugin, same shape as
-- agenda/0001_agenda.sql: one admin-managed catalog (`holidays`) plus two tenant self-service
-- tables built on top of it (`holidays_tenant` — on/off toggle per catalog entry,
-- `holidays_tenant_custom_days_off` — a tenant's own days off, not from the catalog at all).
--
-- Design notes (see task report for full context):
-- 1) `holidays.tenant_id`/`created_by` are new columns that never existed in foco-total's old
--    migrations/0001_initial_schema.sql, even though db/extras/feriados_nacionais.sql already
--    inserts against them. NULL tenant_id = national/global catalog entry shared by every tenant;
--    a filled tenant_id = a catalog entry a specific tenant added for itself (state/city holiday
--    not worth seeding globally). Both nullable.
-- 2) `holidays_tenant` gains `active` and `created_by` — columns
--    src/lib/server/resources/resource-holidays.ts already selects but that never existed in
--    db/migrations/0004_holidays_tenant.sql. `holidays_tenant_custom_days_off` is redesigned to
--    match that same resource file's `select`/`mapInput` 1:1 (`name`, `recurring`, `description`,
--    `active`, `date_interval`, `date_interval_end`, `deleted`) instead of the old ad-hoc
--    `reason` column, which no code path reads.

-- ---------------------------------------------------------------------------------------------
-- 1) holidays — shared catalog. Readable by any session (same "open read" principle as the
--    taxonomy plugin's categories/categories_sub); writes gated by holidays.manage.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.holidays (
    id           uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name         text NOT NULL,
    description  text,
    date         date NOT NULL,
    scope        text NOT NULL DEFAULT 'national'
                 CHECK (scope IN ('national', 'state', 'city')),
    state_code   text,
    city_ibge    text,
    recurring    boolean NOT NULL DEFAULT false,
    active       boolean NOT NULL DEFAULT true,
    tenant_id    uuid REFERENCES auth.tenants(uid) ON DELETE CASCADE,
    created_by   uuid REFERENCES auth.users(uid) ON DELETE SET NULL,
    created_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_holidays_date ON public.holidays(date);
CREATE INDEX IF NOT EXISTS idx_holidays_scope ON public.holidays(scope);
CREATE INDEX IF NOT EXISTS idx_holidays_tenant_id ON public.holidays(tenant_id);

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.holidays TO auth_user, anon;
-- No DELETE — no plugin does physical delete (see plugins/README.md). Removing a catalog entry
-- is a soft delete (`active = false`), already covered by the UPDATE grant/policy below. The
-- REVOKE strips DELETE back off an install from before this change.
GRANT INSERT, UPDATE ON TABLE public.holidays TO auth_user;
REVOKE DELETE ON TABLE public.holidays FROM auth_user;

DROP POLICY IF EXISTS holidays_select_policy ON public.holidays;
CREATE POLICY holidays_select_policy ON public.holidays FOR SELECT TO auth_user, anon
USING (true);

-- Writes gated by the holidays.manage permission (registered below). Nobody is granted it by
-- default — see plugins/README.md convention; root already passes this check via
-- auth.fun_auth_has_perm's is_root bypass, no role_grants row needed.
DROP POLICY IF EXISTS holidays_insert_policy ON public.holidays;
CREATE POLICY holidays_insert_policy ON public.holidays FOR INSERT TO auth_user
WITH CHECK (auth.fun_auth_has_perm('holidays', 'manage'));

DROP POLICY IF EXISTS holidays_update_policy ON public.holidays;
CREATE POLICY holidays_update_policy ON public.holidays FOR UPDATE TO auth_user
USING (auth.fun_auth_has_perm('holidays', 'manage'))
WITH CHECK (auth.fun_auth_has_perm('holidays', 'manage'));

-- No longer created — physical delete is disallowed (see the GRANT note above).
DROP POLICY IF EXISTS holidays_delete_policy ON public.holidays;

-- ---------------------------------------------------------------------------------------------
-- 2) holidays_tenant — a tenant's on/off preference against a catalog entry. Strictly
--    self-service (a tenant manages only its own rows), no permission gate.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.holidays_tenant (
    id           uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id    uuid NOT NULL DEFAULT auth.fun_auth_current_tenant_id() REFERENCES auth.tenants(uid) ON DELETE RESTRICT,
    holiday_id   uuid NOT NULL REFERENCES public.holidays(id) ON DELETE CASCADE,
    is_off       boolean NOT NULL DEFAULT true,
    active       boolean NOT NULL DEFAULT true,
    created_by   uuid NOT NULL DEFAULT auth.fun_auth_user_id() REFERENCES auth.users(uid) ON DELETE RESTRICT,
    created_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_holidays_tenant_tenant_id ON public.holidays_tenant(tenant_id);
CREATE INDEX IF NOT EXISTS idx_holidays_tenant_holiday_id ON public.holidays_tenant(holiday_id);

ALTER TABLE public.holidays_tenant ENABLE ROW LEVEL SECURITY;
-- No DELETE — soft delete (`active = false`) via the UPDATE grant/policy below.
GRANT SELECT, INSERT, UPDATE ON TABLE public.holidays_tenant TO auth_user;
REVOKE DELETE ON TABLE public.holidays_tenant FROM auth_user;

DROP POLICY IF EXISTS holidays_tenant_select_policy ON public.holidays_tenant;
CREATE POLICY holidays_tenant_select_policy ON public.holidays_tenant FOR SELECT TO auth_user
USING (tenant_id = auth.fun_auth_current_tenant_id());

DROP POLICY IF EXISTS holidays_tenant_insert_policy ON public.holidays_tenant;
CREATE POLICY holidays_tenant_insert_policy ON public.holidays_tenant FOR INSERT TO auth_user
WITH CHECK (tenant_id = auth.fun_auth_current_tenant_id());

DROP POLICY IF EXISTS holidays_tenant_update_policy ON public.holidays_tenant;
CREATE POLICY holidays_tenant_update_policy ON public.holidays_tenant FOR UPDATE TO auth_user
USING (tenant_id = auth.fun_auth_current_tenant_id())
WITH CHECK (tenant_id = auth.fun_auth_current_tenant_id());

-- No longer created — physical delete is disallowed (see the GRANT note above).
DROP POLICY IF EXISTS holidays_tenant_delete_policy ON public.holidays_tenant;

-- ---------------------------------------------------------------------------------------------
-- 3) holidays_tenant_custom_days_off — a tenant's own days off, unrelated to the catalog.
--    Columns mirror resource-holidays.ts's `holidays_tenant_custom_days_off` select/mapInput 1:1
--    (see design note 2 above) instead of the old migrations/0004 shape (`reason`, no soft
--    delete, no interval). Strictly self-service, no permission gate.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.holidays_tenant_custom_days_off (
    id                  uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id           uuid NOT NULL DEFAULT auth.fun_auth_current_tenant_id() REFERENCES auth.tenants(uid) ON DELETE RESTRICT,
    name                text NOT NULL,
    date                date NOT NULL,
    date_interval       boolean NOT NULL DEFAULT false,
    date_interval_end   date,
    recurring           boolean NOT NULL DEFAULT false,
    description         text,
    active              boolean NOT NULL DEFAULT true,
    deleted             boolean NOT NULL DEFAULT false,
    created_by          uuid NOT NULL DEFAULT auth.fun_auth_user_id() REFERENCES auth.users(uid) ON DELETE RESTRICT,
    created_at          timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_custom_days_off_tenant_id ON public.holidays_tenant_custom_days_off(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_days_off_date ON public.holidays_tenant_custom_days_off(date);

ALTER TABLE public.holidays_tenant_custom_days_off ENABLE ROW LEVEL SECURITY;
-- No DELETE — soft delete (`active`/`deleted`, both already columns here) via the UPDATE
-- grant/policy below.
GRANT SELECT, INSERT, UPDATE ON TABLE public.holidays_tenant_custom_days_off TO auth_user;
REVOKE DELETE ON TABLE public.holidays_tenant_custom_days_off FROM auth_user;

DROP POLICY IF EXISTS holidays_custom_days_off_select_policy ON public.holidays_tenant_custom_days_off;
CREATE POLICY holidays_custom_days_off_select_policy ON public.holidays_tenant_custom_days_off FOR SELECT TO auth_user
USING (tenant_id = auth.fun_auth_current_tenant_id());

DROP POLICY IF EXISTS holidays_custom_days_off_insert_policy ON public.holidays_tenant_custom_days_off;
CREATE POLICY holidays_custom_days_off_insert_policy ON public.holidays_tenant_custom_days_off FOR INSERT TO auth_user
WITH CHECK (tenant_id = auth.fun_auth_current_tenant_id());

DROP POLICY IF EXISTS holidays_custom_days_off_update_policy ON public.holidays_tenant_custom_days_off;
CREATE POLICY holidays_custom_days_off_update_policy ON public.holidays_tenant_custom_days_off FOR UPDATE TO auth_user
USING (tenant_id = auth.fun_auth_current_tenant_id())
WITH CHECK (tenant_id = auth.fun_auth_current_tenant_id());

-- No longer created — physical delete is disallowed (see the GRANT note above).
DROP POLICY IF EXISTS holidays_custom_days_off_delete_policy ON public.holidays_tenant_custom_days_off;

-- Plugin registration + RBAC wiring (see plugins/README.md convention). holidays.manage is
-- registered in the catalog only — no role gets it automatically. Root already passes
-- auth.fun_auth_has_perm for it via the is_root bypass; granting it to a tenant role (or any
-- other role) is left to whoever installs/administers the consuming project.
-- holidays_tenant/holidays_tenant_custom_days_off stay self-service only (no admin permission —
-- a tenant's own calendar isn't something an admin edits here).
INSERT INTO auth.permissions (resource, action, name)
VALUES ('holidays', 'manage', 'Gerenciar catálogo de feriados')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('holidays', '1.0.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';


-- ===================================================================
-- PLUGIN: agenda  (2 arquivos)
-- ===================================================================



-- ===================================================================
-- 0001_agenda.sql
-- ===================================================================

-- plugins/agenda/0001_agenda.sql
-- Optional. Depends only on core (auth.users, auth.tenants, auth.fun_auth_user_id(),
-- auth.fun_auth_current_tenant_id()). Two tables: agenda_events (a user's own calendar events)
-- and agenda_settings (one view-preferences row per user+tenant). Both strictly self-service —
-- same shape as user_data/account_preferences, no admin-facing "manage another user's agenda"
-- capability exists here, so no permission is registered (see plugins/README.md convention).
--
-- "end" is a reserved SQL keyword — quoted everywhere it's declared/referenced, same fix already
-- applied to the `order` column in migrations/0001_initial_schema.sql. Don't drop the quotes.

-- ---------------------------------------------------------------------------------------------
-- 1) agenda_events — a user's own calendar events. calendar_id/resource_id are free-form text
--    (foreign key, not FK'd here — which fixed set of calendars/resources exists is a
--    project-level concern; foco-total keeps its 3 resources as an in-code constant, not a
--    table, see src/lib/server/agenda-constants.ts).
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agenda_events (
    id           uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id    uuid NOT NULL DEFAULT auth.fun_auth_current_tenant_id() REFERENCES auth.tenants(uid) ON DELETE RESTRICT,
    user_id      uuid NOT NULL DEFAULT auth.fun_auth_user_id() REFERENCES auth.users(uid) ON DELETE RESTRICT,
    title        text NOT NULL,
    start        timestamptz NOT NULL,
    "end"        timestamptz NOT NULL,
    description  text,
    location     text,
    people       jsonb,
    calendar_id  text NOT NULL,
    resource_id  text,
    active       boolean NOT NULL DEFAULT true,
    created_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Backfill for a table created before `active` existed here.
ALTER TABLE public.agenda_events ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_agenda_events_user_start ON public.agenda_events(user_id, start);

ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;
-- No DELETE — no plugin does physical delete (see plugins/README.md). Removing an event is a
-- soft delete (`active = false`), which the existing UPDATE grant/policy below already covers.
-- The REVOKE strips DELETE back off an install from before this change (GRANT alone never
-- removes a privilege a prior apply already handed out).
GRANT SELECT, INSERT, UPDATE ON TABLE public.agenda_events TO auth_user;
REVOKE DELETE ON TABLE public.agenda_events FROM auth_user;

DROP POLICY IF EXISTS agenda_events_select_policy ON public.agenda_events;
CREATE POLICY agenda_events_select_policy ON public.agenda_events FOR SELECT TO auth_user
USING (user_id = auth.fun_auth_user_id());

DROP POLICY IF EXISTS agenda_events_insert_policy ON public.agenda_events;
CREATE POLICY agenda_events_insert_policy ON public.agenda_events FOR INSERT TO auth_user
WITH CHECK (user_id = auth.fun_auth_user_id());

DROP POLICY IF EXISTS agenda_events_update_policy ON public.agenda_events;
CREATE POLICY agenda_events_update_policy ON public.agenda_events FOR UPDATE TO auth_user
USING (user_id = auth.fun_auth_user_id())
WITH CHECK (user_id = auth.fun_auth_user_id());

-- No longer created — physical delete is disallowed (see the GRANT note above). Dropped so a
-- re-apply against an install from before this change removes it too.
DROP POLICY IF EXISTS agenda_events_delete_policy ON public.agenda_events;

-- ---------------------------------------------------------------------------------------------
-- 2) agenda_settings — singleton row per (user_id, tenant_id), same composite-PK-as-uniqueness
--    shape as account_preferences/0001_account_preferences.sql. Columns mirror
--    AgendaSettingsPayload (src/types/agenda.ts) 1:1 so the API layer needs no field mapping
--    beyond camelCase<->snake_case.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agenda_settings (
    user_id                uuid NOT NULL DEFAULT auth.fun_auth_user_id() REFERENCES auth.users(uid) ON DELETE RESTRICT,
    tenant_id              uuid NOT NULL DEFAULT auth.fun_auth_current_tenant_id() REFERENCES auth.tenants(uid) ON DELETE RESTRICT,
    enabled                boolean NOT NULL DEFAULT true,
    default_view           text NOT NULL DEFAULT 'week'
                           CHECK (default_view IN ('day', 'week', 'month-grid', 'list')),
    timezone               text NOT NULL DEFAULT 'America/Sao_Paulo',
    week_starts_on         text NOT NULL DEFAULT 'monday'
                           CHECK (week_starts_on IN ('monday', 'sunday')),
    show_weekends          boolean NOT NULL DEFAULT true,
    show_decluttered_list  boolean NOT NULL DEFAULT false,
    reminders_enabled      boolean NOT NULL DEFAULT true,
    created_at             timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT agenda_settings_pkey PRIMARY KEY (user_id, tenant_id)
);

ALTER TABLE public.agenda_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON TABLE public.agenda_settings TO auth_user;

DROP POLICY IF EXISTS agenda_settings_policy ON public.agenda_settings;
CREATE POLICY agenda_settings_policy ON public.agenda_settings FOR ALL TO auth_user
USING (user_id = auth.fun_auth_user_id())
WITH CHECK (user_id = auth.fun_auth_user_id());

-- Plugin registration (see plugins/README.md convention). No permissions registered: both tables
-- are strictly self-service, same as user_data/account_preferences — no admin override to view
-- or edit another user's events/settings exists here.
INSERT INTO auth.plugin_registry (name, version)
VALUES ('agenda', '1.0.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';


-- ===================================================================
-- 0002_agenda_config.sql
-- ===================================================================

-- plugins/agenda/0002_agenda_config.sql
-- Follow-up migration for the `agenda` plugin (0001 created agenda_events + agenda_settings).
-- Adds the tenant's *schedule configuration*: named weekly schedules ("Comercial", "Fim de
-- semana"…), one set of weekday rows per schedule, plus two per-tenant singletons — booking
-- rules and agenda notification preferences.
--
-- Depends only on core (auth.tenants, auth.users, auth.fun_auth_user_id(),
-- auth.fun_auth_current_tenant_id()). Strictly self-service, same as agenda_settings — a tenant
-- manages only its own rows, no admin "manage another tenant's schedule" capability exists, so
-- no permission is registered (see plugins/README.md convention).
--
-- Idempotent: CREATE TABLE IF NOT EXISTS + DROP POLICY IF EXISTS before every CREATE POLICY.
-- No plugin does physical DELETE (see plugins/README.md) — removing a schedule is a soft delete
-- (`active = false`); the REVOKE strips DELETE back off an install from before this file.

-- ---------------------------------------------------------------------------------------------
-- 1) agenda_schedule — a named weekly schedule. N per tenant. A consuming project points its
--    own domain rows at one of these (e.g. foco-total adds services.schedule_id — an FK that
--    lives in the project, not here: this plugin knows nothing about "services").
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agenda_schedule (
    id           uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id    uuid NOT NULL DEFAULT auth.fun_auth_current_tenant_id() REFERENCES auth.tenants(uid) ON DELETE RESTRICT,
    created_by   uuid NOT NULL DEFAULT auth.fun_auth_user_id() REFERENCES auth.users(uid) ON DELETE RESTRICT,
    name         text NOT NULL,
    timezone     text NOT NULL DEFAULT 'America/Sao_Paulo',
    -- `active` = the enable/disable toggle (a disabled schedule stays visible, greyed out).
    -- `deleted` = soft delete (the row disappears from every read; see softDeleteField in the
    -- resource config). No plugin does physical DELETE.
    active       boolean NOT NULL DEFAULT true,
    deleted      boolean NOT NULL DEFAULT false,
    created_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.agenda_schedule ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_agenda_schedule_tenant ON public.agenda_schedule(tenant_id) WHERE NOT deleted;

ALTER TABLE public.agenda_schedule ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON TABLE public.agenda_schedule TO auth_user;
REVOKE DELETE ON TABLE public.agenda_schedule FROM auth_user;

DROP POLICY IF EXISTS agenda_schedule_select_policy ON public.agenda_schedule;
CREATE POLICY agenda_schedule_select_policy ON public.agenda_schedule FOR SELECT TO auth_user
USING (tenant_id = auth.fun_auth_current_tenant_id());

DROP POLICY IF EXISTS agenda_schedule_insert_policy ON public.agenda_schedule;
CREATE POLICY agenda_schedule_insert_policy ON public.agenda_schedule FOR INSERT TO auth_user
WITH CHECK (tenant_id = auth.fun_auth_current_tenant_id());

DROP POLICY IF EXISTS agenda_schedule_update_policy ON public.agenda_schedule;
CREATE POLICY agenda_schedule_update_policy ON public.agenda_schedule FOR UPDATE TO auth_user
USING (tenant_id = auth.fun_auth_current_tenant_id())
WITH CHECK (tenant_id = auth.fun_auth_current_tenant_id());

DROP POLICY IF EXISTS agenda_schedule_delete_policy ON public.agenda_schedule;

-- ---------------------------------------------------------------------------------------------
-- 2) agenda_schedule_hours — weekday rows for one schedule. Fixed small set per schedule:
--    day_of_week 0..6 (Sun..Sat) plus the sentinel 9 = lunch break (same window shape, applied
--    across every active day — mirrors foco-total's original LUNCH_DAY_OF_WEEK convention).
--    One row per (schedule_id, day_of_week); the client upserts (POST new / PATCH existing),
--    never deletes.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agenda_schedule_hours (
    id           uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id  uuid NOT NULL REFERENCES public.agenda_schedule(id) ON DELETE CASCADE,
    tenant_id    uuid NOT NULL DEFAULT auth.fun_auth_current_tenant_id() REFERENCES auth.tenants(uid) ON DELETE RESTRICT,
    day_of_week  smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6 OR day_of_week = 9),
    open_time    time NOT NULL,
    close_time   time NOT NULL,
    active       boolean NOT NULL DEFAULT true,
    created_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT agenda_schedule_hours_unique UNIQUE (schedule_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_agenda_schedule_hours_schedule ON public.agenda_schedule_hours(schedule_id);

ALTER TABLE public.agenda_schedule_hours ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON TABLE public.agenda_schedule_hours TO auth_user;
REVOKE DELETE ON TABLE public.agenda_schedule_hours FROM auth_user;

DROP POLICY IF EXISTS agenda_schedule_hours_select_policy ON public.agenda_schedule_hours;
CREATE POLICY agenda_schedule_hours_select_policy ON public.agenda_schedule_hours FOR SELECT TO auth_user
USING (tenant_id = auth.fun_auth_current_tenant_id());

DROP POLICY IF EXISTS agenda_schedule_hours_insert_policy ON public.agenda_schedule_hours;
CREATE POLICY agenda_schedule_hours_insert_policy ON public.agenda_schedule_hours FOR INSERT TO auth_user
WITH CHECK (
    tenant_id = auth.fun_auth_current_tenant_id()
    AND EXISTS (
        SELECT 1 FROM public.agenda_schedule s
        WHERE s.id = schedule_id AND s.tenant_id = auth.fun_auth_current_tenant_id()
    )
);

DROP POLICY IF EXISTS agenda_schedule_hours_update_policy ON public.agenda_schedule_hours;
CREATE POLICY agenda_schedule_hours_update_policy ON public.agenda_schedule_hours FOR UPDATE TO auth_user
USING (tenant_id = auth.fun_auth_current_tenant_id())
WITH CHECK (tenant_id = auth.fun_auth_current_tenant_id());

DROP POLICY IF EXISTS agenda_schedule_hours_delete_policy ON public.agenda_schedule_hours;

-- ---------------------------------------------------------------------------------------------
-- 3) agenda_booking_preferences — per-tenant singleton (UNIQUE tenant_id). Keeps a surrogate
--    `id` so the generic /api/resources route and useTenantResource (POST-then-PATCH) work
--    unchanged. Carries foco-total's original business_preferences fields 1:1.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agenda_booking_preferences (
    id                    uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id             uuid NOT NULL DEFAULT auth.fun_auth_current_tenant_id() REFERENCES auth.tenants(uid) ON DELETE RESTRICT,
    created_by            uuid NOT NULL DEFAULT auth.fun_auth_user_id() REFERENCES auth.users(uid) ON DELETE RESTRICT,
    booking_window_days   integer NOT NULL DEFAULT 7,
    client_picks_schedule boolean NOT NULL DEFAULT false,
    min_advance_hours     integer NOT NULL DEFAULT 4,
    buffer_minutes        integer NOT NULL DEFAULT 30,
    service_radius_km     integer NOT NULL DEFAULT 10,
    auto_accept_trusted   boolean NOT NULL DEFAULT false,
    active                boolean NOT NULL DEFAULT true,
    created_at            timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT agenda_booking_preferences_tenant_unique UNIQUE (tenant_id)
);

ALTER TABLE public.agenda_booking_preferences ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON TABLE public.agenda_booking_preferences TO auth_user;

DROP POLICY IF EXISTS agenda_booking_preferences_policy ON public.agenda_booking_preferences;
CREATE POLICY agenda_booking_preferences_policy ON public.agenda_booking_preferences FOR ALL TO auth_user
USING (tenant_id = auth.fun_auth_current_tenant_id())
WITH CHECK (tenant_id = auth.fun_auth_current_tenant_id());

-- ---------------------------------------------------------------------------------------------
-- 4) agenda_notification_preferences — per-tenant singleton. What/when/how the tenant is
--    notified about agenda activity. Mechanism only: which channels actually deliver is the
--    consuming project's concern (foco-total wires these to the `notifications`/email layers).
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agenda_notification_preferences (
    id                    uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id             uuid NOT NULL DEFAULT auth.fun_auth_current_tenant_id() REFERENCES auth.tenants(uid) ON DELETE RESTRICT,
    created_by            uuid NOT NULL DEFAULT auth.fun_auth_user_id() REFERENCES auth.users(uid) ON DELETE RESTRICT,
    notify_new_booking    boolean NOT NULL DEFAULT true,
    notify_cancellation   boolean NOT NULL DEFAULT true,
    notify_reminder       boolean NOT NULL DEFAULT true,
    reminder_hours_before integer NOT NULL DEFAULT 24,
    channel_email         boolean NOT NULL DEFAULT true,
    channel_push          boolean NOT NULL DEFAULT true,
    channel_whatsapp      boolean NOT NULL DEFAULT false,
    active                boolean NOT NULL DEFAULT true,
    created_at            timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT agenda_notification_preferences_tenant_unique UNIQUE (tenant_id)
);

ALTER TABLE public.agenda_notification_preferences ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON TABLE public.agenda_notification_preferences TO auth_user;

DROP POLICY IF EXISTS agenda_notification_preferences_policy ON public.agenda_notification_preferences;
CREATE POLICY agenda_notification_preferences_policy ON public.agenda_notification_preferences FOR ALL TO auth_user
USING (tenant_id = auth.fun_auth_current_tenant_id())
WITH CHECK (tenant_id = auth.fun_auth_current_tenant_id());

-- ---------------------------------------------------------------------------------------------
-- Plugin registration — bump agenda 1.0.0 -> 1.1.0. No permissions registered (self-service).
-- ---------------------------------------------------------------------------------------------
INSERT INTO auth.plugin_registry (name, version)
VALUES ('agenda', '1.1.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
