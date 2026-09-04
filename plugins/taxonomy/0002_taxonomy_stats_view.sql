-- plugins/taxonomy/0002_taxonomy_stats_view.sql
-- Read model for taxonomy browse/admin UIs. One row per active subcategory, carrying its parent
-- category (id, name, group) plus `qtd` = number of active subcategories in that same parent
-- category (window count).
--
-- PURE taxonomy: this view references ONLY the taxonomy tables. It deliberately does NOT count
-- listings/services/ads — that is consumer-specific (a `services`/`ads` table this plugin knows
-- nothing about). A consuming project that needs "listings per subcategory" layers its own view
-- on top (see foco-total's src/lib/server/resources/resource-search.ts).
--
-- Idempotent: CREATE OR REPLACE VIEW. `security_invoker = true` so the querying role's RLS on the
-- underlying taxonomy tables applies (they are already read-open to anon / auth_user via
-- 0001_taxonomy.sql).
--
-- Applied by scripts/install.sh after 0001_taxonomy.sql (files run in filename order).

CREATE OR REPLACE VIEW public.vw_category_subcategory_stats
WITH (security_invoker = true) AS
SELECT
  cs.id                                   AS subcategory_id,
  cs.name                                 AS subcategory_name,
  c.id                                    AS category_id,
  c.name                                  AS category_name,
  c.category_group_id                     AS category_group_id,
  (count(*) OVER (PARTITION BY c.id))::int AS qtd
FROM public.categories_sub cs
JOIN public.categories c ON c.id = cs.category_id
WHERE cs.active = true
  AND c.active = true;

GRANT SELECT ON public.vw_category_subcategory_stats TO anon, auth_user;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('taxonomy', '1.3.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
