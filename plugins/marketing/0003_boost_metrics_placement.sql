-- plugins/marketing/0003_boost_metrics_placement.sql
-- Métrica do impulsionamento separando o que a VAGA PATROCINADA entregou do orgânico no período.
-- Depende de analytics 0004 (coluna `analytics_events.placement`: 'sponsored' = o card estava numa
-- vaga patrocinada, ou o detalhe foi aberto a partir de uma). As colunas antigas continuam iguais
-- (TOTAL do anúncio no período: orgânico + patrocinado); as novas `sponsored_*` são a parte paga.
-- Orgânico = total − patrocinado. `CREATE OR REPLACE VIEW` só acrescenta colunas no fim.
-- Sem função, sem trigger (regra do plugin). Idempotente.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'analytics_events' AND column_name = 'placement'
  ) THEN
    RAISE EXCEPTION 'marketing 0003 precisa de analytics 0004 (coluna analytics_events.placement)';
  END IF;
END $$;

CREATE OR REPLACE VIEW public.vw_boost_metrics_daily WITH (security_invoker = true) AS
SELECT b.id AS boost_id, b.tenant_id, b.service_uid, e.day,
       COUNT(*) FILTER (WHERE e.event_type = 'impression') AS impressions,
       COUNT(*) FILTER (WHERE e.event_type = 'view') AS views,
       COUNT(*) FILTER (WHERE e.event_type = 'contact_click') AS contact_clicks,
       COUNT(*) FILTER (WHERE e.event_type IN ('favorite', 'share')) AS interactions,
       COUNT(*) FILTER (WHERE e.event_type = 'impression' AND e.placement = 'sponsored') AS sponsored_impressions,
       COUNT(*) FILTER (WHERE e.event_type = 'view' AND e.placement = 'sponsored') AS sponsored_views,
       COUNT(*) FILTER (WHERE e.event_type = 'contact_click' AND e.placement = 'sponsored') AS sponsored_contact_clicks,
       COUNT(*) FILTER (WHERE e.event_type IN ('favorite', 'share') AND e.placement = 'sponsored') AS sponsored_interactions
FROM public.boosts b
JOIN public.analytics_events e
  ON e.entity_id = b.service_uid
 AND e.day >= b.starts_on
 AND e.day <= LEAST(b.ends_on, COALESCE(b.stopped_on - 1, b.ends_on))
GROUP BY b.id, b.tenant_id, b.service_uid, e.day;

GRANT SELECT ON public.vw_boost_metrics_daily TO auth_user;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('marketing', '1.2.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
