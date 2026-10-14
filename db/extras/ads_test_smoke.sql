BEGIN;
DO $$
DECLARE v_ok boolean; v_n integer; v_c uuid := gen_random_uuid(); v_v uuid := gen_random_uuid(); v_o uuid := gen_random_uuid();
BEGIN
  ASSERT to_regclass('public.ad_slots') IS NOT NULL, 'ad_slots existe';
  ASSERT EXISTS (SELECT 1 FROM auth.plugin_registry WHERE name = 'ads'), 'plugin registrado';

  INSERT INTO public.ad_slots (slug, enabled, media) VALUES ('smoke-on', true, ARRAY['imagem','google']);
  UPDATE public.ad_slots SET google_weight = 1 WHERE slug = 'smoke-on';
  INSERT INTO public.ad_slots (slug, enabled, media, google_weight) VALUES ('smoke-nogoogle', true, ARRAY['imagem'], 5);
  INSERT INTO public.ad_slots (slug, enabled, media, google_weight) VALUES ('smoke-w0', true, ARRAY['imagem','google'], 0);
  INSERT INTO public.ad_slots (slug, enabled, media) VALUES ('smoke-off', false, ARRAY['imagem']);
  INSERT INTO public.ad_creatives (id, format, kind, image_url, link_url, label, weight, active, ends_at)
  VALUES (v_c, 'banner', 'imagem', '/x.webp', 'https://x.com', 'X', 1, true, now() - interval '1 day');

  INSERT INTO public.ad_creatives (id, format, kind, image_url, link_url, label) VALUES (v_v, 'banner', 'imagem', '/v.webp', 'https://v.com', 'V');
  INSERT INTO public.ad_creatives (id, format, kind, image_url, link_url, label, slots) VALUES (v_o, 'banner', 'imagem', '/o.webp', 'https://o.com', 'O', ARRAY['outro']);

  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  SET LOCAL ROLE anon;

  -- leitura pública: slot desabilitado e criativo vencido não aparecem
  SELECT count(*) INTO v_n FROM public.ad_slots WHERE slug = 'smoke-off';
  ASSERT v_n = 0, 'slot desabilitado invisível';
  SELECT count(*) INTO v_n FROM public.ad_creatives WHERE id = v_c;
  ASSERT v_n = 0, 'criativo vencido invisível';

  -- escrita direta negada
  BEGIN
    INSERT INTO public.ad_slots (slug) VALUES ('hack');
    RAISE EXCEPTION 'esperava erro';
  EXCEPTION WHEN insufficient_privilege OR others THEN
    IF SQLERRM = 'esperava erro' THEN RAISE; END IF;
  END;

  -- tracking
  v_ok := public.fn_ad_track('smoke-on', NULL, '/', 'impression');
  ASSERT v_ok, 'impressão google registra';
  v_ok := public.fn_ad_track('smoke-on', NULL, '/', 'impression');
  ASSERT v_ok, 'incrementa de novo';
  v_ok := public.fn_ad_track('smoke-off', NULL, '/', 'impression');
  ASSERT NOT v_ok, 'slot desabilitado não conta';
  v_ok := public.fn_ad_track('smoke-on', NULL, 'http://evil.com/x?y=1', 'impression');
  ASSERT NOT v_ok, 'página inválida rejeitada';
  v_ok := public.fn_ad_track('smoke-on', NULL, '/', 'purchase');
  ASSERT NOT v_ok, 'evento inválido rejeitado';
  v_ok := public.fn_ad_track('smoke-on', NULL, '/', 'click');
  ASSERT NOT v_ok, 'clique sem criativo próprio não conta';

  ASSERT NOT public.fn_ad_track('smoke-nogoogle', NULL, '/', 'impression'), 'google sem media nao conta';
  ASSERT NOT public.fn_ad_track('smoke-w0', NULL, '/', 'impression'), 'google peso 0 nao conta';
  ASSERT public.fn_ad_track('smoke-on', v_v, '/', 'click'), 'clique com criativo valido conta';
  ASSERT NOT public.fn_ad_track('smoke-on', v_c, '/', 'impression'), 'vencido nao conta impressao';
  ASSERT NOT public.fn_ad_track('smoke-on', v_c, '/', 'click'), 'vencido nao conta clique';
  ASSERT NOT public.fn_ad_track('smoke-on', v_o, '/', 'click'), 'criativo de outro slot nao conta';
  ASSERT NOT public.fn_ad_track('smoke-on', NULL, '/a/b/c/d/e', 'impression'), '5 segmentos rejeitado';
  ASSERT public.fn_ad_track('smoke-on', NULL, '/a/b/c/d', 'impression'), '4 segmentos ok';
  BEGIN
    INSERT INTO public.ad_stats_daily (slot_slug, creative_id, page) VALUES ('smoke-on', v_v, '/h');
    RAISE EXCEPTION 'esperava erro';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  RESET ROLE;
  SELECT impressions INTO v_n FROM public.ad_stats_daily
   WHERE slot_slug = 'smoke-on' AND page = '/' AND creative_id = '00000000-0000-0000-0000-000000000000';
  ASSERT v_n = 2, 'contador = 2';

  BEGIN
    INSERT INTO public.ad_creatives (format, kind, image_url, link_url) VALUES ('banner', 'imagem', '//x/a.png', 'https://x.com');
    RAISE EXCEPTION 'esperava erro';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  SELECT count(*) INTO v_n FROM public.ad_stats_daily WHERE slot_slug = 'smoke-on' AND id IS NOT NULL;
  ASSERT v_n >= 1, 'id existe e nao nulo';

  RAISE NOTICE 'ads OK';
END $$;
ROLLBACK;
