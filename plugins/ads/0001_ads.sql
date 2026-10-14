-- plugins/ads/0001_ads.sql
-- Plugin: ads — slots de publicidade (Google AdSense + criativos próprios imagem/GIF).
-- Leitura pública só do que está habilitado/vigente; escrita só com `ads`/`manage` (root sempre).
-- Métrica: contadores diários por (slot, criativo, página, dia), sem dado pessoal. Uma única
-- função (escrita anônima por RPC, SECURITY DEFINER, validando tudo). Idempotente.

CREATE TABLE IF NOT EXISTS public.ad_slots (
  slug           text PRIMARY KEY,
  enabled        boolean NOT NULL DEFAULT false,
  media          text[]  NOT NULL DEFAULT ARRAY['imagem','gif','google'],
  google_weight  integer NOT NULL DEFAULT 0,
  google_ad_unit text,
  rotate_seconds integer NOT NULL DEFAULT 0,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ad_slots_slug_chk   CHECK (slug ~ '^[a-z0-9-]{1,40}$'),
  CONSTRAINT ad_slots_media_chk  CHECK (media <@ ARRAY['imagem','gif','google']),
  CONSTRAINT ad_slots_weight_chk CHECK (google_weight BETWEEN 0 AND 1000),
  CONSTRAINT ad_slots_rotate_chk CHECK (rotate_seconds = 0 OR rotate_seconds BETWEEN 5 AND 600)
);

CREATE TABLE IF NOT EXISTS public.ad_creatives (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  format     text NOT NULL,
  kind       text NOT NULL,
  image_url  text NOT NULL,
  alt        text NOT NULL DEFAULT '',
  link_url   text NOT NULL,
  label      text NOT NULL DEFAULT '',
  weight     integer NOT NULL DEFAULT 1,
  starts_at  timestamptz,
  ends_at    timestamptz,
  cities     text[] NOT NULL DEFAULT '{}',
  slots      text[] NOT NULL DEFAULT '{}',
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ad_creatives_format_chk CHECK (format IN ('faixa','banner','card','card-vertical','retangulo')),
  CONSTRAINT ad_creatives_kind_chk   CHECK (kind IN ('imagem','gif')),
  CONSTRAINT ad_creatives_weight_chk CHECK (weight BETWEEN 0 AND 1000),
  CONSTRAINT ad_creatives_link_chk   CHECK (link_url ~* '^https?://'),
  CONSTRAINT ad_creatives_image_chk  CHECK (image_url ~ '^(/[^/]|https?://)')
);
-- image_url: caminho relativo ('/x', nunca '//host') ou http/https. Idempotente p/ DB existente.
ALTER TABLE public.ad_creatives DROP CONSTRAINT IF EXISTS ad_creatives_image_chk;
UPDATE public.ad_creatives SET image_url = '/invalid.webp', active = false WHERE image_url !~ '^(/[^/]|https?://)';
ALTER TABLE public.ad_creatives ADD CONSTRAINT ad_creatives_image_chk CHECK (image_url ~ '^(/[^/]|https?://)');

-- creative_id = 00000000-0000-0000-0000-000000000000 representa o Google (sem criativo próprio).
CREATE TABLE IF NOT EXISTS public.ad_stats_daily (
  id          bigint GENERATED ALWAYS AS IDENTITY,
  slot_slug   text NOT NULL,
  creative_id uuid NOT NULL,
  page        text NOT NULL,
  day         date NOT NULL DEFAULT CURRENT_DATE,
  impressions integer NOT NULL DEFAULT 0,
  clicks      integer NOT NULL DEFAULT 0,
  PRIMARY KEY (slot_slug, creative_id, page, day)
);
-- id: chave estavel para o resource generico (PK composta permanece). Idempotente p/ DB existente.
ALTER TABLE public.ad_stats_daily ADD COLUMN IF NOT EXISTS id bigint GENERATED ALWAYS AS IDENTITY;
ALTER TABLE public.ad_stats_daily DROP CONSTRAINT IF EXISTS ad_stats_daily_id_key;
ALTER TABLE public.ad_stats_daily ADD CONSTRAINT ad_stats_daily_id_key UNIQUE (id);
ALTER TABLE public.ad_stats_daily DROP CONSTRAINT IF EXISTS ad_stats_page_chk;
DELETE FROM public.ad_stats_daily WHERE page !~ '^/([A-Za-z0-9_\[\]-]{1,40}(/[A-Za-z0-9_\[\]-]{1,40}){0,3})?$';
ALTER TABLE public.ad_stats_daily ADD CONSTRAINT ad_stats_page_chk CHECK (page ~ '^/([A-Za-z0-9_\[\]-]{1,40}(/[A-Za-z0-9_\[\]-]{1,40}){0,3})?$');
CREATE INDEX IF NOT EXISTS ad_stats_daily_day ON public.ad_stats_daily (day DESC);

ALTER TABLE public.ad_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_stats_daily ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.ad_slots, public.ad_creatives TO anon, auth_user;
GRANT INSERT, UPDATE ON public.ad_slots, public.ad_creatives TO auth_user;
GRANT SELECT ON public.ad_stats_daily TO auth_user;
REVOKE DELETE ON public.ad_slots, public.ad_creatives FROM anon, auth_user;
REVOKE INSERT, UPDATE, DELETE ON public.ad_stats_daily FROM anon, auth_user;

INSERT INTO auth.permissions (resource, action, name)
VALUES ('ads', 'manage', 'Gerenciar publicidade (slots, criativos e métricas)')
ON CONFLICT (resource, action) DO NOTHING;

DROP POLICY IF EXISTS ad_slots_select ON public.ad_slots;
CREATE POLICY ad_slots_select ON public.ad_slots FOR SELECT TO anon, auth_user
USING (enabled OR auth.fun_auth_has_perm('ads', 'manage'));
DROP POLICY IF EXISTS ad_slots_insert ON public.ad_slots;
CREATE POLICY ad_slots_insert ON public.ad_slots FOR INSERT TO auth_user
WITH CHECK (auth.fun_auth_has_perm('ads', 'manage'));
DROP POLICY IF EXISTS ad_slots_update ON public.ad_slots;
CREATE POLICY ad_slots_update ON public.ad_slots FOR UPDATE TO auth_user
USING (auth.fun_auth_has_perm('ads', 'manage'))
WITH CHECK (auth.fun_auth_has_perm('ads', 'manage'));

DROP POLICY IF EXISTS ad_creatives_select ON public.ad_creatives;
CREATE POLICY ad_creatives_select ON public.ad_creatives FOR SELECT TO anon, auth_user
USING (
  (active AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()))
  OR auth.fun_auth_has_perm('ads', 'manage')
);
DROP POLICY IF EXISTS ad_creatives_insert ON public.ad_creatives;
CREATE POLICY ad_creatives_insert ON public.ad_creatives FOR INSERT TO auth_user
WITH CHECK (auth.fun_auth_has_perm('ads', 'manage'));
DROP POLICY IF EXISTS ad_creatives_update ON public.ad_creatives;
CREATE POLICY ad_creatives_update ON public.ad_creatives FOR UPDATE TO auth_user
USING (auth.fun_auth_has_perm('ads', 'manage'))
WITH CHECK (auth.fun_auth_has_perm('ads', 'manage'));

DROP POLICY IF EXISTS ad_stats_select ON public.ad_stats_daily;
CREATE POLICY ad_stats_select ON public.ad_stats_daily FOR SELECT TO auth_user
USING (auth.fun_auth_has_perm('ads', 'manage'));

-- Única função: escrita anônima. SECURITY DEFINER porque anon não tem UPDATE no contador.
-- Valida slot habilitado, evento, página e (para clique) criativo próprio existente.
-- true = contou; false = rejeitado.
DROP FUNCTION IF EXISTS public.fn_ad_track(text, uuid, text, text);
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
DECLARE
  v_creative uuid := COALESCE(p_creative_id, '00000000-0000-0000-0000-000000000000'::uuid);
BEGIN
  IF p_event NOT IN ('impression', 'click') THEN RETURN false; END IF;
  IF p_page IS NULL OR p_page !~ '^/([A-Za-z0-9_\[\]-]{1,40}(/[A-Za-z0-9_\[\]-]{1,40}){0,3})?$' THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ad_slots WHERE slug = p_slot AND enabled) THEN RETURN false; END IF;
  IF p_creative_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.ad_creatives WHERE id = p_creative_id AND active
       AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now())
       AND (cardinality(slots) = 0 OR p_slot = ANY(slots))
  ) THEN RETURN false; END IF;
  IF p_event = 'click' AND p_creative_id IS NULL THEN RETURN false; END IF;
  -- impressão do Google: só se o slot aceita 'google' e tem peso > 0.
  IF p_creative_id IS NULL AND NOT EXISTS (
    SELECT 1 FROM public.ad_slots WHERE slug = p_slot AND 'google' = ANY(media) AND google_weight > 0
  ) THEN RETURN false; END IF;

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
REVOKE ALL ON FUNCTION public.fn_ad_track(text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_ad_track(text, uuid, text, text) TO anon, auth_user;

-- Retenção: 400 dias (SQL inline, só com pg_cron).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'ads_retention';
    PERFORM cron.schedule('ads_retention', '20 3 * * *',
      'DELETE FROM public.ad_stats_daily WHERE day < CURRENT_DATE - 400');
  ELSE
    RAISE NOTICE 'pg_cron ausente — agendar por fora: DELETE FROM public.ad_stats_daily WHERE day < CURRENT_DATE - 400;';
  END IF;
END $$;

INSERT INTO auth.plugin_registry (name, version)
VALUES ('ads', '1.0.0')
ON CONFLICT (name) DO UPDATE SET version = EXCLUDED.version;

NOTIFY pgrst, 'reload schema';
