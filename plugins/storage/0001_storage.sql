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
