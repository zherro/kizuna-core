-- plugins/ads/0002_ads_track_live_campaign.sql
-- Contagem de banner mais honesta:
--   1) Só conta impressão/clique de criativo que pode estar no ar NAQUELE espaço: ativo, vigente,
--      espaço habilitado e, se for de anunciante (plugin marketing, `tenant_id` preenchido), com
--      campanha viva nesse espaço (`vw_ad_campaigns_live`: criativo aprovado, período corrente, não
--      parada; a campanha é pré-paga, a reserva de saldo já foi conferida na criação). Criativo do
--      próprio site (tenant_id NULL) segue como antes.
--   2) Dedup no servidor: uma impressão e um clique por (visitante do dia, espaço, criativo, dia).
--      O visitante é o id anônimo diário do navegador (o mesmo `kz-vid` do analytics, aleatório e
--      trocado a cada dia UTC). A tabela de controle guarda só 2 dias. `ad_stats_daily` continua
--      sendo contador agregado (sem dado pessoal) — passa a significar "únicos por dia" para quem
--      chama a função nova.
--
-- Assinaturas:
--   * `fn_ad_track(text, uuid, text, text)` — MESMA assinatura de antes (chamadas antigas seguem
--     valendo), agora com a regra (1). Sem visitante, não deduplica.
--   * `fn_ad_track_v2(text, uuid, text, text, text)` — mesma regra + p_visitor_hash (dedup). É a
--     que o cliente novo chama. Nome separado de propósito: sobrecarga com DEFAULT deixaria a
--     chamada de 4 argumentos ambígua.
--
-- Funciona com ou sem o plugin marketing (ordem do install: ads antes de marketing): as tabelas do
-- marketing são consultadas por SQL dinâmico só quando existem. Rejeição devolve false, sem erro.
-- Idempotente.

-- =========================================================================
-- 1) Controle de dedup (visitante do dia × espaço × criativo × evento)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.ad_track_seen (
  day          date NOT NULL DEFAULT CURRENT_DATE,
  slot_slug    text NOT NULL,
  creative_id  uuid NOT NULL,
  event        text NOT NULL,
  visitor_hash text NOT NULL,
  PRIMARY KEY (day, slot_slug, creative_id, event, visitor_hash),
  CONSTRAINT ad_track_seen_event_chk CHECK (event IN ('impression', 'click')),
  CONSTRAINT ad_track_seen_hash_chk  CHECK (visitor_hash ~ '^[0-9a-f]{16,64}$')
);
-- Ninguém lê nem escreve direto: só as funções (SECURITY DEFINER). RLS sem policy = negado.
ALTER TABLE public.ad_track_seen ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ad_track_seen FROM PUBLIC;
REVOKE ALL ON public.ad_track_seen FROM anon, auth_user;

-- =========================================================================
-- 2) Regra comum + dedup
-- =========================================================================
CREATE OR REPLACE FUNCTION public.fn_ad_track_v2(
  p_slot         text,
  p_creative_id  uuid,
  p_page         text,
  p_event        text,
  p_visitor_hash text
)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
DECLARE
  v_creative uuid := COALESCE(p_creative_id, '00000000-0000-0000-0000-000000000000'::uuid);
  v_tenant   uuid;
  v_live     boolean;
  v_rows     integer;
BEGIN
  IF p_event IS NULL OR p_event NOT IN ('impression', 'click') THEN RETURN false; END IF;
  IF p_page IS NULL OR p_page !~ '^/([A-Za-z0-9_\[\]-]{1,40}(/[A-Za-z0-9_\[\]-]{1,40}){0,3})?$' THEN RETURN false; END IF;
  IF p_visitor_hash IS NOT NULL AND p_visitor_hash !~ '^[0-9a-f]{16,64}$' THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ad_slots WHERE slug = p_slot AND enabled) THEN RETURN false; END IF;
  IF p_event = 'click' AND p_creative_id IS NULL THEN RETURN false; END IF;

  IF p_creative_id IS NULL THEN
    -- impressão do Google: só se o slot aceita 'google' e tem peso > 0.
    IF NOT EXISTS (
      SELECT 1 FROM public.ad_slots WHERE slug = p_slot AND 'google' = ANY(media) AND google_weight > 0
    ) THEN RETURN false; END IF;
  ELSE
    -- criativo ativo, vigente e permitido neste espaço.
    IF NOT EXISTS (
      SELECT 1 FROM public.ad_creatives WHERE id = p_creative_id AND active
         AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now())
         AND (cardinality(slots) = 0 OR p_slot = ANY(slots))
    ) THEN RETURN false; END IF;
    -- criativo de anunciante (marketing): precisa de campanha viva NESTE espaço.
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_attribute
                WHERE attrelid = 'public.ad_creatives'::regclass AND attname = 'tenant_id' AND NOT attisdropped) THEN
      EXECUTE 'SELECT tenant_id FROM public.ad_creatives WHERE id = $1' INTO v_tenant USING p_creative_id;
      IF v_tenant IS NOT NULL THEN
        IF to_regclass('public.vw_ad_campaigns_live') IS NULL THEN RETURN false; END IF;
        EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.vw_ad_campaigns_live WHERE creative_id = $1 AND slot_slug = $2)'
          INTO v_live USING p_creative_id, p_slot;
        IF NOT COALESCE(v_live, false) THEN RETURN false; END IF;
      END IF;
    END IF;
  END IF;

  -- dedup por visitante do dia (sem visitante = chamada antiga, conta sempre).
  IF p_visitor_hash IS NOT NULL THEN
    INSERT INTO public.ad_track_seen (day, slot_slug, creative_id, event, visitor_hash)
    VALUES (CURRENT_DATE, p_slot, v_creative, p_event, p_visitor_hash)
    ON CONFLICT DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN RETURN false; END IF;
  END IF;

  INSERT INTO public.ad_stats_daily (slot_slug, creative_id, page, day, impressions, clicks)
  VALUES (p_slot, v_creative, p_page, CURRENT_DATE,
          CASE WHEN p_event = 'impression' THEN 1 ELSE 0 END,
          CASE WHEN p_event = 'click' THEN 1 ELSE 0 END)
  ON CONFLICT (slot_slug, creative_id, page, day) DO UPDATE
    SET impressions = public.ad_stats_daily.impressions + EXCLUDED.impressions,
        clicks      = public.ad_stats_daily.clicks + EXCLUDED.clicks;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_ad_track_v2(text, uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_ad_track_v2(text, uuid, text, text, text) TO anon, auth_user;

-- Assinatura antiga preservada: mesma regra, sem dedup (não há visitante).
CREATE OR REPLACE FUNCTION public.fn_ad_track(
  p_slot        text,
  p_creative_id uuid,
  p_page        text,
  p_event       text
)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
BEGIN
  RETURN public.fn_ad_track_v2(p_slot, p_creative_id, p_page, p_event, NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.fn_ad_track(text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_ad_track(text, uuid, text, text) TO anon, auth_user;
-- `CREATE OR REPLACE` mantém o dono antigo de fn_ad_track (pode ser outro papel, ex.: banco
-- restaurado de backup). Ela roda como esse dono e chama a v2: o dono precisa de EXECUTE nela.
DO $$
DECLARE v_owner name;
BEGIN
  SELECT pg_get_userbyid(proowner) INTO v_owner FROM pg_proc
   WHERE oid = 'public.fn_ad_track(text, uuid, text, text)'::regprocedure;
  EXECUTE format('GRANT EXECUTE ON FUNCTION public.fn_ad_track_v2(text, uuid, text, text, text) TO %I', v_owner);
END $$;

-- =========================================================================
-- 3) Retenção do controle de dedup: 2 dias (pg_cron; sem ele, só avisa)
-- =========================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'ads_seen_retention';
    PERFORM cron.schedule('ads_seen_retention', '25 3 * * *',
      'DELETE FROM public.ad_track_seen WHERE day < CURRENT_DATE - 1');
  ELSE
    RAISE NOTICE 'pg_cron ausente — agendar por fora: DELETE FROM public.ad_track_seen WHERE day < CURRENT_DATE - 1;';
  END IF;
END $$;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('ads', '1.1.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
