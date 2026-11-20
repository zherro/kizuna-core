-- plugins/analytics/0004_analytics_placement.sql
-- Exibição PATROCINADA separada da orgânica + origens novas. Necessário para a métrica do
-- impulsionamento (plugin marketing) não misturar o que o anúncio teria de qualquer jeito com o
-- que a vaga paga entregou. Inócuo para quem não usa marketing: coluna anulável, nada muda nos
-- eventos já gravados nem no cliente antigo.
--
--   (1) `placement text` (NULL = orgânico; 'sponsored' = o card estava numa vaga patrocinada).
--   (2) "1 linha por (entidade, evento, visitante, dia)" passa a valer POR placement: o mesmo
--       visitante pode gerar no mesmo dia uma impressão orgânica e uma patrocinada (são duas
--       exposições diferentes). A constraint UNIQUE vira índice único com COALESCE(placement, '').
--       `ON CONFLICT DO NOTHING` (sem alvo) das funções continua valendo.
--   (3) origens novas: 'today' (página Hoje), 'swipe' (Descobrir) e 'related' ("Também pode te
--       interessar" no detalhe). O CHECK é recriado com a lista inteira.
--   (4) `fn_analytics_track_ctx` ganha `p_placement text DEFAULT NULL` (14º parâmetro). A assinatura de
--       13 é removida para não sobrar overload ambíguo no PostgREST; quem chama com 13 argumentos
--       nomeados continua funcionando (o 14º tem padrão). Valor fora da lista vira NULL (sem erro).
-- Idempotente.

ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS placement text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'analytics_events_placement_chk' AND conrelid = 'public.analytics_events'::regclass
  ) THEN
    ALTER TABLE public.analytics_events
      ADD CONSTRAINT analytics_events_placement_chk CHECK (placement IN ('sponsored'));
  END IF;
END $$;

-- (3) origens: recria só se a definição atual não tem 'related' (reaplicar não revalida a tabela).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'analytics_events_source_chk'
       AND conrelid = 'public.analytics_events'::regclass
       AND pg_get_constraintdef(oid) LIKE '%related%'
  ) THEN
    ALTER TABLE public.analytics_events DROP CONSTRAINT IF EXISTS analytics_events_source_chk;
    ALTER TABLE public.analytics_events ADD CONSTRAINT analytics_events_source_chk
      CHECK (source IN ('search','home','category','direct','share','other','today','swipe','related'));
  END IF;
END $$;

-- (2) unicidade por placement. Cria o índice antes de largar a constraint (nunca fica sem dedupe).
CREATE UNIQUE INDEX IF NOT EXISTS analytics_events_once_per_day_placement
  ON public.analytics_events (entity_type, entity_id, event_type, visitor_hash, day, (COALESCE(placement, '')));
ALTER TABLE public.analytics_events DROP CONSTRAINT IF EXISTS analytics_events_once_per_day;

-- Leitura do dono ganha a coluna nova (o GRANT por coluna da 0003 não a inclui).
GRANT SELECT (placement) ON TABLE public.analytics_events TO auth_user;

-- Índice para a métrica do impulsionamento (só as linhas patrocinadas, poucas).
CREATE INDEX IF NOT EXISTS analytics_events_sponsored
  ON public.analytics_events (entity_id, day) WHERE placement IS NOT NULL;

-- (4) função do servidor com placement
DROP FUNCTION IF EXISTS public.fn_analytics_track_ctx(text, uuid, text, text, text, integer,
  text, text, text, text, text, text, uuid);
CREATE OR REPLACE FUNCTION public.fn_analytics_track_ctx(
  p_entity_type  text,
  p_entity_id    uuid,
  p_event_type   text,
  p_visitor_hash text,
  p_source       text,
  p_visible_ms   integer,
  p_device       text,
  p_region_city  text,
  p_region_uf    text,
  p_ip_masked    text,
  p_ip_key       text,
  p_ip           text,
  p_viewer_id    uuid,
  p_placement    text DEFAULT NULL
)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $$
DECLARE
  v_rows       integer;
  v_device     text := lower(btrim(p_device));
  v_region_uf  text := upper(btrim(p_region_uf));
  v_region_city text := NULLIF(left(btrim(p_region_city), 80), '');
  v_ip_key     text := lower(btrim(p_ip_key));
  v_ip_masked  text := CASE WHEN char_length(p_ip_masked) <= 64 THEN NULLIF(p_ip_masked, '') END;
  v_ip         text := CASE WHEN char_length(p_ip) <= 512 THEN NULLIF(p_ip, '') END;
  v_placement  text := CASE WHEN p_placement = 'sponsored' THEN 'sponsored' END;
  v_constraint text;
BEGIN
  IF p_entity_type IS DISTINCT FROM 'service' OR to_regclass('public.services') IS NULL THEN
    RETURN false;
  END IF;
  -- Mesmas regras da policy de INSERT: anúncio ativo e o dono não conta o próprio anúncio.
  IF NOT EXISTS (
    SELECT 1 FROM public.services s
     WHERE s.uid = p_entity_id
       AND s.active
       AND s.created_by IS DISTINCT FROM p_viewer_id
  ) THEN
    RETURN false;
  END IF;
  IF v_device NOT IN ('mobile','tablet','desktop') THEN v_device := NULL; END IF;
  IF v_region_uf !~ '^[A-Z]{2}$' THEN v_region_uf := NULL; END IF;
  IF v_ip_key !~ '^[0-9a-f]{64}$' THEN v_ip_key := NULL; END IF;
  BEGIN
    INSERT INTO public.analytics_events (
      entity_type, entity_id, event_type, source, visitor_hash, visible_ms,
      device, region_city, region_uf, ip_masked, ip_key, ip, placement
    )
    VALUES (
      p_entity_type, p_entity_id, p_event_type, COALESCE(NULLIF(p_source, ''), 'direct'),
      p_visitor_hash, COALESCE(p_visible_ms, 0),
      v_device, v_region_city, v_region_uf, v_ip_masked, v_ip_key, v_ip, v_placement
    )
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
  EXCEPTION WHEN check_violation OR not_null_violation THEN
    -- Levanta de novo só com o nome da constraint: o DETAIL original traz a linha inteira (com o IP).
    GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
    RAISE EXCEPTION 'analytics_events: valor inválido (%)', COALESCE(NULLIF(v_constraint, ''), 'not null')
      USING ERRCODE = 'check_violation';
  END;
  RETURN v_rows = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_analytics_track_ctx(text, uuid, text, text, text, integer,
  text, text, text, text, text, text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_analytics_track_ctx(text, uuid, text, text, text, integer,
  text, text, text, text, text, text, uuid, text) FROM anon, auth_user;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.fn_analytics_track_ctx(text, uuid, text, text, text, integer,
      text, text, text, text, text, text, uuid, text) TO service_role;
  ELSE
    RAISE NOTICE 'papel service_role ausente (sql/0117) — fn_analytics_track_ctx sem EXECUTE';
  END IF;
END $$;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('analytics', '2.3.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
