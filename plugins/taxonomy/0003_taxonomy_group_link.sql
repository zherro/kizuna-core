-- plugins/taxonomy/0003_taxonomy_group_link.sql
-- Adds cross-group discovery to the taxonomy tree WITHOUT turning `category_group_id` into a
-- many-to-many column. `categories.category_group_id` stays the category's single "home" group
-- (unchanged — it's what a service inherits at creation time via `services.category_group_id`,
-- see plugins/services/0001_services.sql). This migration only adds an OPTIONAL secondary
-- membership: a category can additionally be listed under other groups' browse/search vitrines,
-- without touching `services` or `service_categories_sub` at all.
--
-- Pure join table, same shape/grant convention as `service_categories_sub` (plugins/services/
-- 0001_services.sql) rather than the entity tables above (categories_group/categories/
-- categories_sub/categories_sub_tags): a link row has no independent lifecycle to soft-delete —
-- removing a secondary group membership is a real DELETE, not `active = false`.
--
-- Idempotent, from-zero-safe — same convention as every other plugins/*/NNNN_*.sql.

CREATE TABLE IF NOT EXISTS public.categories_group_link (
  id                 bigserial PRIMARY KEY,
  category_id        bigint NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  category_group_id  bigint NOT NULL REFERENCES public.categories_group(id) ON DELETE CASCADE,
  tenant_id          uuid DEFAULT auth.fun_auth_current_tenant_id(),
  created_by         uuid DEFAULT auth.fun_auth_user_id(),
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_group_link_unique UNIQUE (category_id, category_group_id)
);

CREATE INDEX IF NOT EXISTS idx_categories_group_link_category_id ON public.categories_group_link(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_group_link_group_id ON public.categories_group_link(category_group_id);

-- bigserial's underlying sequence needs its own GRANT — a table GRANT never covers it.
GRANT USAGE, SELECT ON SEQUENCE public.categories_group_link_id_seq TO auth_user;

ALTER TABLE public.categories_group_link ENABLE ROW LEVEL SECURITY;

-- Read-open (same as the rest of the taxonomy tree — /busca and the wizard's category picker
-- both read this as `anon` or `auth_user`), write-gated behind `categorias.manage`. Physical
-- DELETE is granted here (unlike the entity tables) because this row IS the membership — there
-- is nothing left to soft-delete once it's gone, exactly like `service_categories_sub`.
GRANT SELECT ON TABLE public.categories_group_link TO anon, auth_user;
GRANT INSERT, DELETE ON TABLE public.categories_group_link TO auth_user;

DROP POLICY IF EXISTS categories_group_link_select_policy ON public.categories_group_link;
CREATE POLICY categories_group_link_select_policy ON public.categories_group_link FOR SELECT TO anon, auth_user
USING (true);

DROP POLICY IF EXISTS categories_group_link_insert_policy ON public.categories_group_link;
CREATE POLICY categories_group_link_insert_policy ON public.categories_group_link FOR INSERT TO auth_user
WITH CHECK (auth.fun_auth_has_perm('categorias', 'manage'));

DROP POLICY IF EXISTS categories_group_link_delete_policy ON public.categories_group_link;
CREATE POLICY categories_group_link_delete_policy ON public.categories_group_link FOR DELETE TO auth_user
USING (auth.fun_auth_has_perm('categorias', 'manage'));

INSERT INTO auth.plugin_registry (name, version)
VALUES ('taxonomy', '1.4.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
