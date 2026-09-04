-- plugins/taxonomy/0001_taxonomy.sql
-- Plugin: taxonomy — generic hierarchical taxonomy mechanism, group -> category -> subcategory ->
-- tag. This plugin owns categories_group, categories_sub, and categories_sub_tags outright
-- (CREATE TABLE). Only the middle level, public.categories, is expected to already exist in the
-- consuming project's own base schema (this plugin only ALTERs it — it does not define its base
-- CREATE TABLE, to avoid fighting a project's own migration order for a table that may be FK'd
-- elsewhere, e.g. a `services`/`ads` table owned by the consumer).
--
-- Idempotent, from-zero-safe — same convention as kizuna-core/plugins/*/0001_*.sql (see
-- kizuna-core/plugins/README.md): CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS,
-- ON CONFLICT DO ..., self-registers in auth.plugin_registry, and registers a `categorias`
-- resource + permission (`view`/`manage`) that a consuming project's own admin UI and nav-perm
-- checks are expected to gate on, matching the write policies below.
--
-- IDs are bigserial (not uuid) across the whole tree — verified faster to index for a taxonomy
-- this size, and there's no cross-tenant/cross-system sharing need that would call for uuid.
-- public.categories (the one table this plugin doesn't own) is expected to use the same bigserial
-- convention in the consumer's own migration, since categories_group_id/category_id FKs here are
-- typed bigint.

-- ---------------------------------------------------------------------------------------------
-- 1) categories_group — enum-like table of top-level groups that classify categories, one level
--    above them. Same column conventions as public.categories.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories_group (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  tags text,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_group_slug_key UNIQUE (slug)
);

-- ---------------------------------------------------------------------------------------------
-- 2) categories gains the columns the taxonomy feature needs on top of whatever base shape the
--    consuming project already defines for it: a group + icon + description (icon: a
--    client-resolved icon name, e.g. an icon-library component name). Also gains tenant_id/
--    created_by, matching the ownership columns every other domain table normally carries —
--    nullable (not NOT NULL) because a project's base schema may already seed rows with neither
--    column set; new rows created afterwards pick up the current session via the column defaults.
-- ---------------------------------------------------------------------------------------------
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS category_group_id bigint REFERENCES public.categories_group(id);

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS icon text;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT auth.fun_auth_current_tenant_id();

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.fun_auth_user_id();

-- form_key: optional bridge to the `forms` plugin. When set, a category points at a reusable
-- `public.forms` row (by its tenant-scoped `form_key` string — no FK, `forms` may not be
-- installed). Consuming UIs (the service wizard's dynamic step) use it to decide whether to
-- render a `<DynamicFormStep>` for entities in that category. Harmless (nullable, unreferenced)
-- when the `forms` plugin is absent. Surfaced by kizuna-core's `taxonomy-edit-panel`.
-- Sibling column: `request_form_key` below is the symmetric bridge for the buyer's side —
-- `form_key` is the form the entity's PROVIDER fills (extra fields describing the offer),
-- `request_form_key` is the form the BUYER fills when requesting a quote / closing an order.
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS form_key text;

COMMENT ON COLUMN public.categories.form_key IS
  'form_key of an active public.forms row (forms plugin). When set, consuming UIs render that form (filled by the entity provider) for entities in this category. No FK — forms is tenant-scoped. Sibling: request_form_key (buyer-facing).';

-- request_form_key: symmetric sibling of `form_key`. Same bridge mechanism (tenant-scoped
-- `public.forms.form_key` string, no FK, `forms` may not be installed), but this points at the
-- form the BUYER fills when requesting a quote / closing an order for entities in this category,
-- as opposed to `form_key` which is filled by the entity's provider. Harmless (nullable,
-- unreferenced) when the `forms` plugin is absent. Surfaced by kizuna-core's `taxonomy-edit-panel`.
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS request_form_key text;

COMMENT ON COLUMN public.categories.request_form_key IS
  'form_key of an active public.forms row (forms plugin) used for the buyer''s quote/order-request flow for entities in this category. Buyer-facing sibling of form_key (provider-facing). No FK — forms is tenant-scoped.';

-- ---------------------------------------------------------------------------------------------
-- 3) categories_sub — owned outright by this plugin (unlike `categories`, nothing outside the
--    taxonomy feature FKs it, so there's no reason to leave its base table to the consumer).
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories_sub (
  id bigserial PRIMARY KEY,
  category_id bigint NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  tags text,
  tenant_id uuid DEFAULT auth.fun_auth_current_tenant_id(),
  created_by uuid DEFAULT auth.fun_auth_user_id(),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_sub_slug_key UNIQUE (slug)
);

-- ---------------------------------------------------------------------------------------------
-- 4) categories_sub_tags — free-text search tags one level below categories_sub (the
--    "what the user would type in the search bar" leaf level). Not a globally-unique slug: the
--    same tag text may intentionally repeat under two different subcategories, so uniqueness is
--    scoped to (category_sub_id, slug) instead.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories_sub_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id bigint NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  category_sub_id bigint NOT NULL REFERENCES public.categories_sub(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  tenant_id uuid NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_sub_tags_sub_slug_key UNIQUE (category_sub_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_categories_sub_tags_category_id ON public.categories_sub_tags(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_sub_tags_category_sub_id ON public.categories_sub_tags(category_sub_id);
CREATE INDEX IF NOT EXISTS idx_categories_sub_category_id ON public.categories_sub(category_id);

-- ---------------------------------------------------------------------------------------------
-- 5) RLS. The whole tree (group/category/subcategory/tag) is read-open — it's meant to serve
--    public browse data to anon — and write-gated behind the single `categorias`/`manage`
--    permission, shared by whatever admin screens a consuming project builds for it.
--    `categories` is expected to predate this plugin (defined in the consuming project's own
--    base schema) and may have no RLS policy of its own to mirror; this plugin is the first to
--    enable RLS on it, using the same read-open/write-gated shape as the tables it owns outright
--    so the whole feature is protected consistently under one permission.
-- ---------------------------------------------------------------------------------------------

-- categories_group
-- bigserial's underlying sequence needs its own GRANT — a table GRANT never covers it. Without
-- this, PostgREST returns "permission denied for sequence categories_group_id_seq" on insert
-- even though the table's own GRANT/policy already allow it.
GRANT USAGE, SELECT ON SEQUENCE public.categories_group_id_seq TO auth_user;
ALTER TABLE public.categories_group ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.categories_group TO anon, auth_user;
-- No DELETE — no plugin does physical delete (see plugins/README.md). Removing a group is a
-- soft delete (`active = false`), already covered by the UPDATE grant/policy below.
GRANT INSERT, UPDATE ON TABLE public.categories_group TO auth_user;
REVOKE DELETE ON TABLE public.categories_group FROM auth_user;
DROP POLICY IF EXISTS categories_group_select_policy ON public.categories_group;
CREATE POLICY categories_group_select_policy ON public.categories_group FOR SELECT TO anon, auth_user
USING (true);
DROP POLICY IF EXISTS categories_group_insert_policy ON public.categories_group;
CREATE POLICY categories_group_insert_policy ON public.categories_group FOR INSERT TO auth_user
WITH CHECK (auth.fun_auth_has_perm('categorias', 'manage'));
DROP POLICY IF EXISTS categories_group_update_policy ON public.categories_group;
CREATE POLICY categories_group_update_policy ON public.categories_group FOR UPDATE TO auth_user
USING (auth.fun_auth_has_perm('categorias', 'manage'))
WITH CHECK (auth.fun_auth_has_perm('categorias', 'manage'));
-- No longer created — physical delete is disallowed (see the GRANT note above).
DROP POLICY IF EXISTS categories_group_delete_policy ON public.categories_group;

-- categories (predates this plugin — see note above)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.categories TO anon, auth_user;
-- No DELETE — soft delete (`active = false`) via the UPDATE grant/policy below.
GRANT INSERT, UPDATE ON TABLE public.categories TO auth_user;
REVOKE DELETE ON TABLE public.categories FROM auth_user;
DROP POLICY IF EXISTS categories_select_policy ON public.categories;
CREATE POLICY categories_select_policy ON public.categories FOR SELECT TO anon, auth_user
USING (true);
DROP POLICY IF EXISTS categories_insert_policy ON public.categories;
CREATE POLICY categories_insert_policy ON public.categories FOR INSERT TO auth_user
WITH CHECK (auth.fun_auth_has_perm('categorias', 'manage'));
DROP POLICY IF EXISTS categories_update_policy ON public.categories;
CREATE POLICY categories_update_policy ON public.categories FOR UPDATE TO auth_user
USING (auth.fun_auth_has_perm('categorias', 'manage'))
WITH CHECK (auth.fun_auth_has_perm('categorias', 'manage'));
-- No longer created — physical delete is disallowed (see the GRANT note above).
DROP POLICY IF EXISTS categories_delete_policy ON public.categories;

-- categories_sub
GRANT USAGE, SELECT ON SEQUENCE public.categories_sub_id_seq TO auth_user;
ALTER TABLE public.categories_sub ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.categories_sub TO anon, auth_user;
-- No DELETE — soft delete (`active = false`) via the UPDATE grant/policy below.
GRANT INSERT, UPDATE ON TABLE public.categories_sub TO auth_user;
REVOKE DELETE ON TABLE public.categories_sub FROM auth_user;
DROP POLICY IF EXISTS categories_sub_select_policy ON public.categories_sub;
CREATE POLICY categories_sub_select_policy ON public.categories_sub FOR SELECT TO anon, auth_user
USING (true);
DROP POLICY IF EXISTS categories_sub_insert_policy ON public.categories_sub;
CREATE POLICY categories_sub_insert_policy ON public.categories_sub FOR INSERT TO auth_user
WITH CHECK (auth.fun_auth_has_perm('categorias', 'manage'));
DROP POLICY IF EXISTS categories_sub_update_policy ON public.categories_sub;
CREATE POLICY categories_sub_update_policy ON public.categories_sub FOR UPDATE TO auth_user
USING (auth.fun_auth_has_perm('categorias', 'manage'))
WITH CHECK (auth.fun_auth_has_perm('categorias', 'manage'));
-- No longer created — physical delete is disallowed (see the GRANT note above).
DROP POLICY IF EXISTS categories_sub_delete_policy ON public.categories_sub;

-- categories_sub_tags
ALTER TABLE public.categories_sub_tags ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.categories_sub_tags TO anon, auth_user;
-- No DELETE — soft delete (`active = false`) via the UPDATE grant/policy below.
GRANT INSERT, UPDATE ON TABLE public.categories_sub_tags TO auth_user;
REVOKE DELETE ON TABLE public.categories_sub_tags FROM auth_user;
DROP POLICY IF EXISTS categories_sub_tags_select_policy ON public.categories_sub_tags;
CREATE POLICY categories_sub_tags_select_policy ON public.categories_sub_tags FOR SELECT TO anon, auth_user
USING (true);
DROP POLICY IF EXISTS categories_sub_tags_insert_policy ON public.categories_sub_tags;
CREATE POLICY categories_sub_tags_insert_policy ON public.categories_sub_tags FOR INSERT TO auth_user
WITH CHECK (auth.fun_auth_has_perm('categorias', 'manage'));
DROP POLICY IF EXISTS categories_sub_tags_update_policy ON public.categories_sub_tags;
CREATE POLICY categories_sub_tags_update_policy ON public.categories_sub_tags FOR UPDATE TO auth_user
USING (auth.fun_auth_has_perm('categorias', 'manage'))
WITH CHECK (auth.fun_auth_has_perm('categorias', 'manage'));
-- No longer created — physical delete is disallowed (see the GRANT note above).
DROP POLICY IF EXISTS categories_sub_tags_delete_policy ON public.categories_sub_tags;

-- ---------------------------------------------------------------------------------------------
-- 6) RBAC wiring (see kizuna-core/plugins/README.md convention). Two actions on the `categorias`
--    resource: `view` for read access to the admin UI a consuming project builds on top of this
--    (a nav-perm check typically defaults an authenticated user's check to the 'view' action);
--    `manage` is what the write policies above gate on. Both only exist in the catalog
--    (auth.permissions) — nobody gets either by default. ROOT already reaches everything through
--    fun_auth_has_perm's is_root bypass, no grant needed. Granting either action to a role is a
--    deliberate decision made by whoever administers the consuming project, not a default of
--    this plugin.
-- ---------------------------------------------------------------------------------------------
INSERT INTO auth.permissions (resource, action, name)
VALUES
  ('categorias', 'view', 'Ver categorias e taxonomia'),
  ('categorias', 'manage', 'Gerenciar categorias, subcategorias e tags de busca')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('taxonomy', '1.2.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
