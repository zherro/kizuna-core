-- plugins/analytics/0005_analytics_page_view_utm.sql
-- Visitas de página (page_view) + origem de campanha (UTM) + canal do clique de contato.
-- Inócuo para quem não usa: colunas anuláveis, tabela nova sem escrita pública, e as funções
-- antigas continuam aceitando as chamadas de antes (parâmetros novos têm DEFAULT NULL).
--
--   (1) Tabela PRÓPRIA `analytics_page_views` (e não `analytics_events` com entity_type 'page'):
--       * `analytics_events.entity_id` é uuid NOT NULL de anúncio; a página não tem uuid (teria de
--         inventar um hash do caminho) e as policies/funções de lá exigem `public.services`;
--       * a leitura de `analytics_events` é do DONO do anúncio (RLS por tenant); visitas do site
--         são do portal inteiro e só o root (ou quem tiver `analytics/site`) lê;
--       * volume: uma linha por (caminho, visitante-dia) — separar mantém os índices e a leitura do
--         painel do anunciante do mesmo tamanho de hoje.
--       Uma linha por (caminho, visitante, dia) (UNIQUE): recarregar/voltar não conta de novo.
--       Sem IP, sem região por IP, sem user-agent: só caminho, cidade do portal (slug da rota ou do
--       cookie kz_city), categoria do aparelho e utm_*. Escrita só pelo servidor (service_role).
--   (2) `analytics_events` ganha utm_source/utm_medium/utm_campaign (origem da SESSÃO que gerou o
--       evento) e `channel` (canal do contact_click: whatsapp, phone, purchase, site, email,
--       instagram, other). A deduplicação NÃO muda: o 1º evento do dia (entidade, evento,
--       visitante, placement) é o que fica — com o utm/canal dele.
--   (3) origem nova 'map' (clique de contato no painel do mapa).
--   (4) `fn_analytics_track_ctx` ganha p_utm_source, p_utm_medium, p_utm_campaign, p_channel (DEFAULT
--       NULL). A assinatura de 14 é removida (sem overload ambíguo no PostgREST); chamadas com 13/14
--       argumentos nomeados seguem funcionando. Valor fora do formato vira NULL (sem erro).
--   (5) `fn_analytics_page_view` (escrita, service_role) e `fn_analytics_page_view_summary`
--       (leitura agregada para o painel; INVOKER, a RLS decide quem vê).
-- Idempotente.

-- (2) colunas novas em analytics_events
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS utm_source   text;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS utm_medium   text;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS utm_campaign text;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS channel      text;

DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT * FROM (VALUES
      ('analytics_events_utm_source_chk',   $c$CHECK (utm_source ~ '^[a-z0-9_.-]{1,64}$')$c$),
      ('analytics_events_utm_medium_chk',   $c$CHECK (utm_medium ~ '^[a-z0-9_.-]{1,64}$')$c$),
      ('analytics_events_utm_campaign_chk', $c$CHECK (utm_campaign ~ '^[a-z0-9_.-]{1,64}$')$c$),
      ('analytics_events_channel_chk',
        $c$CHECK (channel IN ('whatsapp','phone','purchase','site','email','instagram','other'))$c$)
    ) AS v(name, def)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
       WHERE conname = c.name AND conrelid = 'public.analytics_events'::regclass
    ) THEN
      EXECUTE format('ALTER TABLE public.analytics_events ADD CONSTRAINT %I %s', c.name, c.def);
    END IF;
  END LOOP;
END $$;

-- (3) origem 'map': recria só se a definição atual não a tem (reaplicar não revalida a tabela).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'analytics_events_source_chk'
       AND conrelid = 'public.analytics_events'::regclass
       AND pg_get_constraintdef(oid) LIKE '%''map''%'
  ) THEN
    ALTER TABLE public.analytics_events DROP CONSTRAINT IF EXISTS analytics_events_source_chk;
    ALTER TABLE public.analytics_events ADD CONSTRAINT analytics_events_source_chk
      CHECK (source IN ('search','home','category','direct','share','other','today','swipe','related','map'));
  END IF;
END $$;

-- Leitura do dono ganha as colunas novas (o GRANT por coluna da 0003/0004 não as inclui).
GRANT SELECT (utm_source, utm_medium, utm_campaign, channel) ON TABLE public.analytics_events TO auth_user;

-- (4) função do servidor com utm + canal
DROP FUNCTION IF EXISTS public.fn_analytics_track_ctx(text, uuid, text, text, text, integer,
  text, text, text, text, text, text, uuid);
DROP FUNCTION IF EXISTS public.fn_analytics_track_ctx(text, uuid, text, text, text, integer,
  text, text, text, text, text, text, uuid, text);
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
  p_placement    text DEFAULT NULL,
  p_utm_source   text DEFAULT NULL,
  p_utm_medium   text DEFAULT NULL,
  p_utm_campaign text DEFAULT NULL,
  p_channel      text DEFAULT NULL
)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $$
DECLARE
  v_rows         integer;
  v_device       text := lower(btrim(p_device));
  v_region_uf    text := upper(btrim(p_region_uf));
  v_region_city  text := NULLIF(left(btrim(p_region_city), 80), '');
  v_ip_key       text := lower(btrim(p_ip_key));
  v_ip_masked    text := CASE WHEN char_length(p_ip_masked) <= 64 THEN NULLIF(p_ip_masked, '') END;
  v_ip           text := CASE WHEN char_length(p_ip) <= 512 THEN NULLIF(p_ip, '') END;
  v_placement    text := CASE WHEN p_placement = 'sponsored' THEN 'sponsored' END;
  v_utm_source   text := CASE WHEN p_utm_source   ~ '^[a-z0-9_.-]{1,64}$' THEN p_utm_source END;
  v_utm_medium   text := CASE WHEN p_utm_medium   ~ '^[a-z0-9_.-]{1,64}$' THEN p_utm_medium END;
  v_utm_campaign text := CASE WHEN p_utm_campaign ~ '^[a-z0-9_.-]{1,64}$' THEN p_utm_campaign END;
  v_channel      text := CASE WHEN p_event_type = 'contact_click'
                               AND p_channel IN ('whatsapp','phone','purchase','site','email','instagram','other')
                              THEN p_channel END;
  v_constraint   text;
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
      device, region_city, region_uf, ip_masked, ip_key, ip, placement,
      utm_source, utm_medium, utm_campaign, channel
    )
    VALUES (
      p_entity_type, p_entity_id, p_event_type, COALESCE(NULLIF(p_source, ''), 'direct'),
      p_visitor_hash, COALESCE(p_visible_ms, 0),
      v_device, v_region_city, v_region_uf, v_ip_masked, v_ip_key, v_ip, v_placement,
      v_utm_source, v_utm_medium, v_utm_campaign, v_channel
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
  text, text, text, text, text, text, uuid, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_analytics_track_ctx(text, uuid, text, text, text, integer,
  text, text, text, text, text, text, uuid, text, text, text, text, text) FROM anon, auth_user;

-- (1) visitas de página
CREATE TABLE IF NOT EXISTS public.analytics_page_views (
  id            bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  path          text        NOT NULL,
  city          text,
  device        text,
  visitor_hash  text        NOT NULL,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  day           date        NOT NULL DEFAULT CURRENT_DATE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT analytics_page_views_path_chk   CHECK (char_length(path) BETWEEN 1 AND 200 AND left(path, 1) = '/'),
  CONSTRAINT analytics_page_views_city_chk   CHECK (city ~ '^[a-z0-9-]{1,80}$'),
  CONSTRAINT analytics_page_views_device_chk CHECK (device IN ('mobile','tablet','desktop')),
  CONSTRAINT analytics_page_views_hash_chk   CHECK (visitor_hash ~ '^[0-9a-f]{16,64}$'),
  CONSTRAINT analytics_page_views_utm_source_chk   CHECK (utm_source   ~ '^[a-z0-9_.-]{1,64}$'),
  CONSTRAINT analytics_page_views_utm_medium_chk   CHECK (utm_medium   ~ '^[a-z0-9_.-]{1,64}$'),
  CONSTRAINT analytics_page_views_utm_campaign_chk CHECK (utm_campaign ~ '^[a-z0-9_.-]{1,64}$'),
  CONSTRAINT analytics_page_views_once_per_day UNIQUE (path, visitor_hash, day)
);
CREATE INDEX IF NOT EXISTS analytics_page_views_day ON public.analytics_page_views (day DESC);

ALTER TABLE public.analytics_page_views ENABLE ROW LEVEL SECURITY;
-- Escrita só pela função SECURITY DEFINER (service_role). Leitura: auth_user, filtrada pela policy.
REVOKE ALL ON TABLE public.analytics_page_views FROM PUBLIC, anon, auth_user;
GRANT SELECT ON TABLE public.analytics_page_views TO auth_user;

-- Permissão própria para ver as visitas do site inteiro (root passa sempre em fun_auth_has_perm).
INSERT INTO auth.permissions (resource, action, name)
VALUES ('analytics', 'site', 'Ver as visitas do site (todas as páginas, origem e cidade)')
ON CONFLICT (resource, action) DO NOTHING;

DO $$
BEGIN
  DROP POLICY IF EXISTS analytics_page_views_select_site ON public.analytics_page_views;
  IF to_regprocedure('auth.fun_auth_has_perm(text,text)') IS NULL THEN
    RAISE NOTICE 'auth.fun_auth_has_perm ausente — analytics_page_views sem policy de leitura (ninguém lê pela API)';
    RETURN;
  END IF;
  CREATE POLICY analytics_page_views_select_site ON public.analytics_page_views FOR SELECT TO auth_user
  USING ((SELECT auth.fun_auth_has_perm('analytics', 'site')));
END $$;

-- (5a) escrita: só o servidor (rota POST /api/analytics/page-view). Campos opcionais fora do
-- formato viram NULL; caminho/hash inválidos = false (não grava, sem erro).
-- true = registrou; false = já existia hoje (UNIQUE) ou entrada inválida.
CREATE OR REPLACE FUNCTION public.fn_analytics_page_view(
  p_path         text,
  p_visitor_hash text,
  p_city         text DEFAULT NULL,
  p_device       text DEFAULT NULL,
  p_utm_source   text DEFAULT NULL,
  p_utm_medium   text DEFAULT NULL,
  p_utm_campaign text DEFAULT NULL
)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = pg_catalog, public
AS $$
DECLARE
  v_rows integer;
BEGIN
  IF p_path IS NULL OR char_length(p_path) NOT BETWEEN 1 AND 200 OR left(p_path, 1) <> '/'
     OR p_visitor_hash IS NULL OR p_visitor_hash !~ '^[0-9a-f]{16,64}$' THEN
    RETURN false;
  END IF;
  INSERT INTO public.analytics_page_views (path, city, device, visitor_hash, utm_source, utm_medium, utm_campaign)
  VALUES (
    p_path,
    CASE WHEN p_city ~ '^[a-z0-9-]{1,80}$' THEN p_city END,
    CASE WHEN p_device IN ('mobile','tablet','desktop') THEN p_device END,
    p_visitor_hash,
    CASE WHEN p_utm_source   ~ '^[a-z0-9_.-]{1,64}$' THEN p_utm_source END,
    CASE WHEN p_utm_medium   ~ '^[a-z0-9_.-]{1,64}$' THEN p_utm_medium END,
    CASE WHEN p_utm_campaign ~ '^[a-z0-9_.-]{1,64}$' THEN p_utm_campaign END
  )
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows = 1;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_analytics_page_view(text, text, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_analytics_page_view(text, text, text, text, text, text, text) FROM anon, auth_user;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.fn_analytics_track_ctx(text, uuid, text, text, text, integer,
      text, text, text, text, text, text, uuid, text, text, text, text, text) TO service_role;
    GRANT EXECUTE ON FUNCTION public.fn_analytics_page_view(text, text, text, text, text, text, text) TO service_role;
  ELSE
    RAISE NOTICE 'papel service_role ausente (sql/0117) — fn_analytics_track_ctx/fn_analytics_page_view sem EXECUTE';
  END IF;
END $$;

-- (5b) leitura agregada para o painel: visitantes-dia por origem, campanha, cidade e aparelho.
-- INVOKER: a policy acima filtra (sem `analytics/site` → tudo zero). Cada visitante-dia é atribuído
-- a UMA origem/campanha (a 1ª não vazia do dia), cidade (a 1ª não vazia) e aparelho — assim a
-- soma das linhas de uma dimensão dá o total. Janela limitada a 366 dias.
-- dimension: 'total' | 'source' | 'campaign' | 'city' | 'device'; key '' = sem valor (direto/não informado).
-- visitors = visitantes-dia distintos; pages = páginas distintas vistas por esses visitantes-dia.
CREATE OR REPLACE FUNCTION public.fn_analytics_page_view_summary(p_from date, p_to date)
 RETURNS TABLE (dimension text, key text, visitors bigint, pages bigint)
 LANGUAGE sql
 STABLE
 SET search_path = pg_catalog, public
AS $$
  WITH r AS (
    SELECT visitor_hash, day, created_at, utm_source, utm_campaign, city, device
      FROM public.analytics_page_views
     WHERE day BETWEEN p_from AND LEAST(p_to, p_from + 366)
  ), v AS (
    SELECT
      COALESCE((array_agg(utm_source   ORDER BY created_at) FILTER (WHERE utm_source   IS NOT NULL))[1], '') AS src,
      COALESCE((array_agg(utm_campaign ORDER BY created_at) FILTER (WHERE utm_campaign IS NOT NULL))[1], '') AS cmp,
      COALESCE((array_agg(city         ORDER BY created_at) FILTER (WHERE city         IS NOT NULL))[1], '') AS cty,
      COALESCE((array_agg(device       ORDER BY created_at) FILTER (WHERE device       IS NOT NULL))[1], '') AS dev,
      count(*) AS n
      FROM r
     GROUP BY visitor_hash, day
  )
  SELECT 'total', '', count(*), COALESCE(sum(n), 0)::bigint FROM v
  UNION ALL SELECT 'source',   src, count(*), sum(n)::bigint FROM v GROUP BY src
  UNION ALL SELECT 'campaign', cmp, count(*), sum(n)::bigint FROM v GROUP BY cmp
  UNION ALL SELECT 'city',     cty, count(*), sum(n)::bigint FROM v GROUP BY cty
  UNION ALL SELECT 'device',   dev, count(*), sum(n)::bigint FROM v GROUP BY dev
$$;
REVOKE ALL ON FUNCTION public.fn_analytics_page_view_summary(date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_analytics_page_view_summary(date, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_analytics_page_view_summary(date, date) TO auth_user;

-- Retenção das visitas: mesmo prazo dos eventos (400 dias). Só com pg_cron.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'analytics_page_views_retention';
    PERFORM cron.schedule('analytics_page_views_retention', '20 3 * * *',
      'DELETE FROM public.analytics_page_views WHERE day < CURRENT_DATE - 400');
  ELSE
    RAISE NOTICE 'pg_cron ausente — agendar por fora: DELETE FROM public.analytics_page_views WHERE day < CURRENT_DATE - 400;';
  END IF;
END $$;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('analytics', '2.4.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
