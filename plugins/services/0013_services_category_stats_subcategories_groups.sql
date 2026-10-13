-- plugins/services/0013_services_category_stats_subcategories_groups.sql
-- `vw_category_service_stats` ganha 3 colunas AO FINAL (mesmo grão: 1 linha por categoria com
-- anúncio publicado e não vencido) para o filtro da busca esconder o que está vazio sem outra fonte:
--   subcategory_ids   → subcategorias (service_categories_sub) com ao menos 1 anúncio vivo
--   category_group_id → grupo primário da categoria
--   group_ids         → grupo primário + vínculos extras (categories_group_link), só grupos ativos
-- As 3 colunas antigas ficam idênticas (carrossel e demais consumidores não mudam).
--
-- Idempotente: CREATE OR REPLACE VIEW (só acrescenta colunas no fim, permitido pelo Postgres).
-- Reverter: reaplicar plugins/services/0010_services_category_stats_not_expired.sql.

CREATE OR REPLACE VIEW public.vw_category_service_stats
WITH (security_invoker = true) AS
SELECT
  c.id                  AS category_id,
  c.name                AS category_name,
  count(s.id)::int      AS services_count,
  COALESCE((
    SELECT array_agg(DISTINCT scs.category_sub_id)
    FROM public.service_categories_sub scs
    JOIN public.services s2
      ON s2.id = scs.service_id
     AND s2.active = true
     AND s2.status = 'active'
     AND (s2.expires_at IS NULL OR s2.expires_at > now())
    WHERE scs.active = true
      AND scs.category_id = c.id
  ), '{}'::bigint[])    AS subcategory_ids,
  c.category_group_id   AS category_group_id,
  COALESCE((
    SELECT array_agg(DISTINCT x.gid)
    FROM (
      SELECT c.category_group_id AS gid
      UNION
      SELECT l.category_group_id
      FROM public.categories_group_link l
      WHERE l.category_id = c.id
    ) x
    JOIN public.categories_group g ON g.id = x.gid AND g.active = true
    WHERE x.gid IS NOT NULL
  ), '{}'::bigint[])    AS group_ids
FROM public.categories c
JOIN public.services s
  ON s.category_id = c.id
 AND s.active = true
 AND s.status = 'active'
 AND (s.expires_at IS NULL OR s.expires_at > now())
WHERE c.active = true
GROUP BY c.id, c.name, c.category_group_id;

GRANT SELECT ON public.vw_category_service_stats TO anon, auth_user;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('services', '1.8.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
