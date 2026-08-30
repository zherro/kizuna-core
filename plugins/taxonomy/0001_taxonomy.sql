-- plugins/taxonomy/0001_taxonomy.sql
-- Plugin: taxonomy — generic hierarchical taxonomy mechanism, group -> category -> subcategory ->
-- tag. Extends public.categories/public.categories_sub, which are expected to already exist in
-- the consuming project's own base schema (this plugin only ALTERs them — it does not define
-- their base CREATE TABLE, to avoid fighting a project's own migration order for tables that may
-- be FK'd elsewhere). This file adds what's specific to the taxonomy feature: the
-- category_group level, category_group_id/icon on categories, and a categories_sub_tags leaf
-- table for free-text search tags.
--
-- Idempotent, from-zero-safe — same convention as kizuna-core/plugins/*/0001_*.sql (see
-- kizuna-core/plugins/README.md): CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS,
-- ON CONFLICT DO ..., self-registers in auth.plugin_registry, and registers a `categorias`
-- resource + permission (`view`/`manage`) that a consuming project's own admin UI and nav-perm
-- checks are expected to gate on, matching the write policies below.

-- ---------------------------------------------------------------------------------------------
-- 1) categories_group — enum-like table of top-level groups that classify categories, one level
--    above them. Same column conventions as public.categories.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories_group (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
-- 2) categories/categories_sub gain the columns the taxonomy feature needs on top of whatever
--    base shape the consuming project already defines for them: a group + icon + description on
--    categories (icon: a client-resolved icon name, e.g. an icon-library component name), and
--    description/tags on categories_sub. Both tables also gain tenant_id/created_by, matching the
--    ownership columns every other domain table normally carries — nullable (not NOT NULL)
--    because a project's base schema may already seed rows with neither column set; new rows
--    created afterwards pick up the current session via the column defaults.
-- ---------------------------------------------------------------------------------------------
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS category_group_id uuid REFERENCES public.categories_group(id);

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS icon text;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT auth.fun_auth_current_tenant_id();

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.fun_auth_user_id();

ALTER TABLE public.categories_sub
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.categories_sub
  ADD COLUMN IF NOT EXISTS tags text;

ALTER TABLE public.categories_sub
  ADD COLUMN IF NOT EXISTS tenant_id uuid DEFAULT auth.fun_auth_current_tenant_id();

ALTER TABLE public.categories_sub
  ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.fun_auth_user_id();

-- ---------------------------------------------------------------------------------------------
-- 3) categories_sub_tags — free-text search tags one level below categories_sub (the
--    "what the user would type in the search bar" leaf level). Not a globally-unique slug: the
--    same tag text may intentionally repeat under two different subcategories, so uniqueness is
--    scoped to (category_sub_id, slug) instead.
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories_sub_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  category_sub_id uuid NOT NULL REFERENCES public.categories_sub(id) ON DELETE CASCADE,
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

-- ---------------------------------------------------------------------------------------------
-- 4) RLS. The whole tree (group/category/subcategory/tag) is read-open — it's meant to serve
--    public browse data to anon — and write-gated behind the single `categorias`/`manage`
--    permission, shared by whatever admin screens a consuming project builds for it.
--    categories/categories_sub are expected to predate this plugin (defined in the consuming
--    project's own base schema) and may have no RLS policy of their own to mirror; this plugin
--    is the first to enable RLS on them, using the same read-open/write-gated shape as the new
--    tables so the whole feature is protected consistently under one permission.
-- ---------------------------------------------------------------------------------------------

-- categories_group
ALTER TABLE public.categories_group ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.categories_group TO anon, auth_user;
GRANT INSERT, UPDATE, DELETE ON TABLE public.categories_group TO auth_user;
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
DROP POLICY IF EXISTS categories_group_delete_policy ON public.categories_group;
CREATE POLICY categories_group_delete_policy ON public.categories_group FOR DELETE TO auth_user
USING (auth.fun_auth_has_perm('categorias', 'manage'));

-- categories (predates this plugin — see note above)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.categories TO anon, auth_user;
GRANT INSERT, UPDATE, DELETE ON TABLE public.categories TO auth_user;
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
DROP POLICY IF EXISTS categories_delete_policy ON public.categories;
CREATE POLICY categories_delete_policy ON public.categories FOR DELETE TO auth_user
USING (auth.fun_auth_has_perm('categorias', 'manage'));

-- categories_sub (predates this plugin — see note above)
ALTER TABLE public.categories_sub ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.categories_sub TO anon, auth_user;
GRANT INSERT, UPDATE, DELETE ON TABLE public.categories_sub TO auth_user;
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
DROP POLICY IF EXISTS categories_sub_delete_policy ON public.categories_sub;
CREATE POLICY categories_sub_delete_policy ON public.categories_sub FOR DELETE TO auth_user
USING (auth.fun_auth_has_perm('categorias', 'manage'));

-- categories_sub_tags
ALTER TABLE public.categories_sub_tags ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.categories_sub_tags TO anon, auth_user;
GRANT INSERT, UPDATE, DELETE ON TABLE public.categories_sub_tags TO auth_user;
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
DROP POLICY IF EXISTS categories_sub_tags_delete_policy ON public.categories_sub_tags;
CREATE POLICY categories_sub_tags_delete_policy ON public.categories_sub_tags FOR DELETE TO auth_user
USING (auth.fun_auth_has_perm('categorias', 'manage'));

-- ---------------------------------------------------------------------------------------------
-- 5) RBAC wiring (see kizuna-core/plugins/README.md convention). Two actions on the `categorias`
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
VALUES ('taxonomy', '1.0.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
