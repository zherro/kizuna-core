-- plugins/services/0010_services_category_stats_not_expired.sql
-- `vw_category_service_stats` passa a ignorar anúncio vencido (`expires_at` no passado), igual à
-- busca (`fn_search_services`). Antes, um evento que já passou mantinha a categoria no carrossel
-- de categorias, e o clique levava a uma busca vazia.
--
-- Idempotente: CREATE OR REPLACE VIEW (mesmas colunas da 0002).

CREATE OR REPLACE VIEW public.vw_category_service_stats
WITH (security_invoker = true) AS
SELECT
  c.id                  AS category_id,
  c.name                AS category_name,
  count(s.id)::int      AS services_count
FROM public.categories c
JOIN public.services s
  ON s.category_id = c.id
 AND s.active = true
 AND s.status = 'active'
 AND (s.expires_at IS NULL OR s.expires_at > now())
WHERE c.active = true
GROUP BY c.id, c.name;

GRANT SELECT ON public.vw_category_service_stats TO anon, auth_user;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('services', '1.5.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
