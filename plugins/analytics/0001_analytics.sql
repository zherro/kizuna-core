-- plugins/analytics/0001_analytics.sql
-- Plugin: analytics — métricas de negócio por entidade (hoje: anúncio/`service`), first-party,
-- sem cookie e sem dado pessoal. UMA tabela (uma linha por visitante/entidade/evento/dia) e UMA
-- função (escrita anônima: o CRUD genérico exige login). Sem views, sem rollup, sem trigger:
-- a leitura é o resource `analytics_events` e a agregação roda no cliente.
--
-- Regras em constraints/RLS:
--   * piso de tempo visível: view >= 500 ms, impression >= 200 ms (CHECK)
--   * 1 linha por (entidade, evento, visitante, dia) (UNIQUE) — repetido é ignorado (ON CONFLICT DO NOTHING)
--   * INSERT só para anúncio ativo que NÃO é do próprio usuário (policy)
--   * SELECT só do dono (tenant do anúncio) (policy)
-- Depende funcionalmente do plugin `services` (as policies referenciam public.services).
-- Retenção: pg_cron inline (sem função) se a extensão existir; senão agendar por fora.
-- Idempotente, from-zero-safe.

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id            bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  entity_type   text        NOT NULL DEFAULT 'service',
  entity_id     uuid        NOT NULL,
  event_type    text        NOT NULL,
  source        text        NOT NULL DEFAULT 'direct',
  visitor_hash  text        NOT NULL,
  visible_ms    integer     NOT NULL DEFAULT 0,
  day           date        NOT NULL DEFAULT CURRENT_DATE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT analytics_events_entity_chk  CHECK (entity_type IN ('service')),
  CONSTRAINT analytics_events_event_chk   CHECK (event_type IN ('impression','view','contact_click','favorite','share')),
  CONSTRAINT analytics_events_source_chk  CHECK (source IN ('search','home','category','direct','share','other')),
  CONSTRAINT analytics_events_hash_chk    CHECK (visitor_hash ~ '^[0-9a-f]{16,64}$'),
  CONSTRAINT analytics_events_ms_chk      CHECK (visible_ms BETWEEN 0 AND 3600000),
  CONSTRAINT analytics_events_min_ms_chk  CHECK (
    (event_type = 'view' AND visible_ms >= 500)
    OR (event_type = 'impression' AND visible_ms >= 200)
    OR event_type NOT IN ('view','impression')
  ),
  CONSTRAINT analytics_events_once_per_day UNIQUE (entity_type, entity_id, event_type, visitor_hash, day)
);
CREATE INDEX IF NOT EXISTS analytics_events_entity_day ON public.analytics_events (entity_id, day DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
REVOKE INSERT ON TABLE public.analytics_events FROM anon, auth_user;
GRANT INSERT (entity_type, entity_id, event_type, source, visitor_hash, visible_ms)
  ON TABLE public.analytics_events TO anon, auth_user;  -- day/created_at só pelo DEFAULT
GRANT SELECT ON TABLE public.analytics_events TO auth_user;
REVOKE UPDATE, DELETE ON TABLE public.analytics_events FROM anon, auth_user;

DO $$
BEGIN
  IF to_regclass('public.services') IS NULL THEN
    RAISE NOTICE 'plugin services ausente — policies de analytics_events não criadas';
    RETURN;
  END IF;

  DROP POLICY IF EXISTS analytics_events_insert ON public.analytics_events;
  CREATE POLICY analytics_events_insert ON public.analytics_events FOR INSERT TO anon, auth_user
  WITH CHECK (
    entity_type = 'service'
    AND EXISTS (
      SELECT 1 FROM public.services s
       WHERE s.uid = analytics_events.entity_id
         AND s.active
         AND s.created_by IS DISTINCT FROM auth.fun_auth_user_id()
    )
  );

  DROP POLICY IF EXISTS analytics_events_select_owner ON public.analytics_events;
  CREATE POLICY analytics_events_select_owner ON public.analytics_events FOR SELECT TO auth_user
  USING (
    EXISTS (
      SELECT 1 FROM public.services s
       WHERE s.uid = analytics_events.entity_id
         AND s.tenant_id = auth.fun_auth_current_tenant_id()
    )
  );
END $$;

-- Única função do plugin: escrita anônima via RPC (createResource exige login).
-- INVOKER: a RLS acima vale. true = registrou; false = já existia hoje (UNIQUE).
DROP FUNCTION IF EXISTS public.fn_analytics_track(text, uuid, text, text, text);
CREATE OR REPLACE FUNCTION public.fn_analytics_track(
  p_entity_type  text,
  p_entity_id    uuid,
  p_event_type   text,
  p_visitor_hash text,
  p_source       text DEFAULT 'direct',
  p_visible_ms   integer DEFAULT 0
)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path = public
AS $$
DECLARE
  v_rows integer;
BEGIN
  -- ON CONFLICT sem alvo: com alvo explícito o Postgres exigiria SELECT nas colunas (anon não tem).
  INSERT INTO public.analytics_events (entity_type, entity_id, event_type, source, visitor_hash, visible_ms)
  VALUES (p_entity_type, p_entity_id, p_event_type, COALESCE(NULLIF(p_source, ''), 'direct'),
          p_visitor_hash, COALESCE(p_visible_ms, 0))
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows = 1;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_analytics_track(text, uuid, text, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_analytics_track(text, uuid, text, text, text, integer) TO anon, auth_user;

-- Retenção: apaga eventos com mais de 400 dias (SQL inline, sem função). Só com pg_cron.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'analytics_retention';
    PERFORM cron.schedule('analytics_retention', '15 3 * * *',
      'DELETE FROM public.analytics_events WHERE day < CURRENT_DATE - 400');
  ELSE
    RAISE NOTICE 'pg_cron ausente — agendar por fora: DELETE FROM public.analytics_events WHERE day < CURRENT_DATE - 400;';
  END IF;
END $$;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('analytics', '2.0.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
