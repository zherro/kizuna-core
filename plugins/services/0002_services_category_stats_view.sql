-- plugins/services/0002_services_category_stats_view.sql
-- Read model: quantos anúncios PUBLICADOS cada categoria tem. Uma linha por categoria ativa com
-- ao menos um anúncio publicado (`active AND status = 'active'`) — categoria sem anúncio não
-- aparece. Usada pelo <CategoryCarousel onlyWithListings> (home: `home.categoriesOnlyWithListings`
-- no kizuna.config.json) para esconder categorias vazias.
--
-- Mora aqui, e não no plugin taxonomy, porque a taxonomy é pura e não conhece `services`
-- (ver o cabeçalho de plugins/taxonomy/0002_taxonomy_stats_view.sql).
--
-- Idempotente: CREATE OR REPLACE VIEW. `security_invoker = true` — valem as RLS de `services` e
-- `categories` de quem consulta; o filtro explícito de status garante que um usuário logado não
-- conte os próprios anúncios pendentes (que a policy services_owner_read deixaria ver).

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
WHERE c.active = true
GROUP BY c.id, c.name;

GRANT SELECT ON public.vw_category_service_stats TO anon, auth_user;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('services', '1.1.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
