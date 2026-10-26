-- plugins/analytics/0003_analytics_context.sql
-- Contexto do evento gravado pelo SERVIDOR (rota POST /api/analytics/track): dispositivo, região
-- (cidade/UF), IP mascarado, chave HMAC do IP (agrupa sem revelar) e IP cifrado. Todas as colunas
-- são anuláveis: eventos antigos e o cliente antigo (fn_analytics_track) seguem sem contexto.
--
-- Regras:
--   * `ip` (cifrado) NUNCA é legível por anon/auth_user: SELECT por coluna, sem `ip`.
--   * anon/auth_user não inserem as colunas novas (o GRANT de INSERT por coluna do 0001 não muda).
--   * escrita com contexto só pela função SECURITY DEFINER abaixo, EXECUTE só para service_role
--     (sql/0117). Como ela pula a RLS, replica as regras da policy de INSERT: só anúncio ativo e
--     o dono não conta o próprio anúncio. Contexto inválido vira NULL (não derruba o evento).
--   * retenção do IP: depois de N dias (setting kizuna.analytics_ip_retention_days, padrão 30;
--     0 = nunca) zera ip/ip_masked/ip_key; o delete de 400 dias da linha inteira (0001) continua.
-- A função antiga `fn_analytics_track` e a policy de INSERT não mudam.
-- Idempotente, from-zero-safe.

ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS device      text;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS region_city text;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS region_uf   text;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS ip_masked   text;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS ip_key      text;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS ip          text;

-- CHECKs só se ainda não existem: reaplicar não revalida a tabela nem segura lock à toa.
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT * FROM (VALUES
      ('analytics_events_device_chk',      $c$CHECK (device IN ('mobile','tablet','desktop'))$c$),
      ('analytics_events_region_uf_chk',   $c$CHECK (region_uf ~ '^[A-Z]{2}$')$c$),
      ('analytics_events_region_city_chk', $c$CHECK (char_length(region_city) <= 80)$c$),
      ('analytics_events_ip_masked_chk',   $c$CHECK (char_length(ip_masked) <= 64)$c$),
      ('analytics_events_ip_key_chk',      $c$CHECK (ip_key ~ '^[0-9a-f]{64}$')$c$),
      ('analytics_events_ip_chk',          $c$CHECK (char_length(ip) <= 512)$c$)
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

-- Leitura do dono: todas as colunas MENOS `ip`. Tira o SELECT de tabela inteira (0001) antes —
-- senão o GRANT por coluna não restringe nada. anon nunca teve SELECT; garante.
REVOKE SELECT ON TABLE public.analytics_events FROM PUBLIC, anon, auth_user;
GRANT SELECT (id, entity_type, entity_id, event_type, source, visitor_hash, visible_ms, day, created_at,
              device, region_city, region_uf, ip_masked, ip_key)
  ON TABLE public.analytics_events TO auth_user;

-- Escrita com contexto, só pelo servidor (service_role). SECURITY DEFINER: pula a RLS, então as
-- regras da policy analytics_events_insert estão aqui, explícitas. p_viewer_id = usuário logado
-- (NULL para visitante). true = registrou; false = já existia hoje, anúncio inativo/inexistente
-- ou visitante é o dono.
-- Contexto (device, região, IP) é opcional: valor fora do formato vira NULL, sem erro — um CHECK
-- levantado aqui perderia o evento e mostraria a linha (com o IP cifrado) no DETAIL do erro.
-- Campos principais inválidos (evento, origem, hash, tempo) ainda levantam check_violation, como
-- em fn_analytics_track, mas sem DETAIL (a linha não vaza).
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
  p_viewer_id    uuid
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
      device, region_city, region_uf, ip_masked, ip_key, ip
    )
    VALUES (
      p_entity_type, p_entity_id, p_event_type, COALESCE(NULLIF(p_source, ''), 'direct'),
      p_visitor_hash, COALESCE(p_visible_ms, 0),
      v_device, v_region_city, v_region_uf, v_ip_masked, v_ip_key, v_ip
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
  text, text, text, text, text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_analytics_track_ctx(text, uuid, text, text, text, integer,
  text, text, text, text, text, text, uuid) FROM anon, auth_user;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.fn_analytics_track_ctx(text, uuid, text, text, text, integer,
      text, text, text, text, text, text, uuid) TO service_role;
  ELSE
    RAISE NOTICE 'papel service_role ausente (sql/0117) — fn_analytics_track_ctx sem EXECUTE';
  END IF;
END $$;

-- Retenção do IP: zera ip/ip_masked/ip_key de linhas mais antigas que N dias. N vem da setting
-- kizuna.analytics_ip_retention_days (ALTER DATABASE ... SET, gravada pela CLI), lida na hora em
-- que o job roda: ausente ou inválida = 30; 0 = nunca zera. Só com pg_cron.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'analytics_ip_retention';
    PERFORM cron.schedule('analytics_ip_retention', '25 3 * * *', $cmd$
      UPDATE public.analytics_events e
         SET ip = NULL, ip_masked = NULL, ip_key = NULL
        FROM (SELECT CASE WHEN v ~ '^[0-9]{1,6}$' THEN v::integer ELSE 30 END AS dias
                FROM (SELECT btrim(COALESCE(current_setting('kizuna.analytics_ip_retention_days', true), '')) AS v) s) r
       WHERE r.dias > 0
         AND e.day < CURRENT_DATE - r.dias
         AND (e.ip IS NOT NULL OR e.ip_masked IS NOT NULL OR e.ip_key IS NOT NULL)
    $cmd$);
  ELSE
    RAISE NOTICE 'pg_cron ausente — agendar por fora (diário), com N = kizuna.analytics_ip_retention_days (padrão 30; 0 = nunca zera, não agende): UPDATE public.analytics_events SET ip = NULL, ip_masked = NULL, ip_key = NULL WHERE day < CURRENT_DATE - N AND (ip IS NOT NULL OR ip_masked IS NOT NULL OR ip_key IS NOT NULL);';
  END IF;
END $$;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('analytics', '2.2.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
