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
