-- db/extras/ads_track_live_smoke.sql — ads 0002: contagem só de criativo no ar + dedup por visitante.
-- Roda numa transação e desfaz tudo (ROLLBACK). Com o plugin marketing, testa também as campanhas
-- (precisa de ao menos 1 tenant e 1 usuário no banco). Uso:
--   docker exec -i postgres_local psql -U myuser -d bora -v ON_ERROR_STOP=1 < db/extras/ads_track_live_smoke.sql
BEGIN;
DO $$
DECLARE
  v_own  uuid := gen_random_uuid();   -- criativo do site
  v_ok   uuid := gen_random_uuid();   -- anunciante: aprovado + campanha viva em smk-a
  v_pend uuid := gen_random_uuid();   -- anunciante: sem revisão (na fila), campanha no período
  v_rej  uuid := gen_random_uuid();   -- anunciante: reprovado
  v_exp  uuid := gen_random_uuid();   -- anunciante: aprovado, campanha já terminou
  v_stop uuid := gen_random_uuid();   -- anunciante: aprovado, campanha parada hoje
  v_tenant uuid; v_user uuid;
  v_vis  text := repeat('ab', 16);
  v_vis2 text := repeat('cd', 16);
  v_n integer;
  v_mkt boolean := to_regclass('public.ad_campaigns') IS NOT NULL;
BEGIN
  INSERT INTO public.ad_slots (slug, enabled, media, google_weight) VALUES
    ('smk-a', true, ARRAY['imagem','google'], 1), ('smk-b', true, ARRAY['imagem'], 0);
  INSERT INTO public.ad_creatives (id, format, kind, image_url, link_url, label)
  VALUES (v_own, 'banner', 'imagem', '/o.webp', 'https://o.com', 'O');

  -- assinatura antiga continua funcionando e sem dedup
  ASSERT public.fn_ad_track('smk-a', v_own, '/', 'impression'), 'antiga: próprio conta';
  ASSERT public.fn_ad_track('smk-a', v_own, '/', 'impression'), 'antiga: sem visitante não deduplica';
  ASSERT public.fn_ad_track('smk-a', NULL, '/', 'impression'), 'antiga: google conta';
  ASSERT NOT public.fn_ad_track('smk-a', NULL, '/', 'click'), 'antiga: clique sem criativo não conta';

  -- v2: dedup por visitante/dia/espaço/criativo/evento
  ASSERT public.fn_ad_track_v2('smk-a', v_own, '/', 'impression', v_vis), 'v2: 1ª impressão conta';
  ASSERT NOT public.fn_ad_track_v2('smk-a', v_own, '/x', 'impression', v_vis), 'v2: recarregar (outra página) não conta';
  ASSERT public.fn_ad_track_v2('smk-a', v_own, '/', 'impression', v_vis2), 'v2: outro visitante conta';
  ASSERT public.fn_ad_track_v2('smk-b', v_own, '/', 'impression', v_vis), 'v2: outro espaço conta';
  ASSERT public.fn_ad_track_v2('smk-a', v_own, '/', 'click', v_vis), 'v2: 1º clique conta';
  ASSERT NOT public.fn_ad_track_v2('smk-a', v_own, '/', 'click', v_vis), 'v2: duplo clique não conta';
  ASSERT public.fn_ad_track_v2('smk-a', NULL, '/', 'impression', v_vis), 'v2: google conta';
  ASSERT NOT public.fn_ad_track_v2('smk-a', NULL, '/', 'impression', v_vis), 'v2: google dedup';
  ASSERT NOT public.fn_ad_track_v2('smk-a', v_own, '/', 'impression', 'NAO-HEX'), 'v2: visitante inválido rejeitado';
  ASSERT NOT public.fn_ad_track_v2('smk-a', v_own, '/', 'purchase', v_vis2), 'v2: evento inválido';
  ASSERT NOT public.fn_ad_track_v2('smk-b', NULL, '/', 'impression', v_vis2), 'v2: google sem media';

  SELECT impressions INTO v_n FROM public.ad_stats_daily WHERE slot_slug = 'smk-a' AND creative_id = v_own AND page = '/';
  ASSERT v_n = 4, format('contador próprio smk-a = 4 (2 antigas + 2 visitantes), veio %s', v_n);
  SELECT clicks INTO v_n FROM public.ad_stats_daily WHERE slot_slug = 'smk-a' AND creative_id = v_own AND page = '/';
  ASSERT v_n = 1, 'clique único = 1';
  SELECT count(*) INTO v_n FROM public.ad_stats_daily WHERE slot_slug = 'smk-a' AND page = '/x';
  ASSERT v_n = 0, 'recarga deduplicada não cria linha';

  IF v_mkt THEN
    SELECT uid INTO v_tenant FROM auth.tenants LIMIT 1;
    SELECT uid INTO v_user FROM auth.users LIMIT 1;
    ASSERT v_tenant IS NOT NULL AND v_user IS NOT NULL, 'precisa de 1 tenant e 1 usuário';
    EXECUTE $q$
      INSERT INTO public.ad_creatives (id, format, kind, image_url, link_url, label, slots, active, tenant_id)
      SELECT x, 'banner', 'imagem', '/a.webp', 'https://a.com', 'A', ARRAY['smk-a','smk-b'], true, $1
        FROM unnest($2::uuid[]) x
    $q$ USING v_tenant, ARRAY[v_ok, v_pend, v_rej, v_exp, v_stop];
    EXECUTE $q$
      INSERT INTO public.ad_creative_reviews (creative_id, status, reviewed_by)
      SELECT x, CASE WHEN x = $2 THEN 'rejected' ELSE 'approved' END, $3 FROM unnest($1::uuid[]) x
    $q$ USING ARRAY[v_ok, v_rej, v_exp, v_stop], v_rej, v_user;
    EXECUTE $q$
      INSERT INTO public.ad_campaigns (creative_id, slot_slug, tenant_id, created_by, daily_cents, starts_on, ends_on, stopped_on) VALUES
        ($1, 'smk-a', $6, $7, 500, CURRENT_DATE - 1, CURRENT_DATE + 5, NULL),
        ($2, 'smk-a', $6, $7, 500, CURRENT_DATE - 1, CURRENT_DATE + 5, NULL),
        ($3, 'smk-a', $6, $7, 500, CURRENT_DATE - 1, CURRENT_DATE + 5, NULL),
        ($4, 'smk-a', $6, $7, 500, CURRENT_DATE - 10, CURRENT_DATE - 1, NULL),
        ($5, 'smk-a', $6, $7, 500, CURRENT_DATE - 3, CURRENT_DATE + 5, CURRENT_DATE)
    $q$ USING v_ok, v_pend, v_rej, v_exp, v_stop, v_tenant, v_user;

    ASSERT public.fn_ad_track_v2('smk-a', v_ok, '/', 'impression', v_vis), 'aprovado + campanha viva conta';
    ASSERT public.fn_ad_track_v2('smk-a', v_ok, '/', 'click', v_vis), 'aprovado: clique conta';
    ASSERT public.fn_ad_track('smk-a', v_ok, '/', 'impression'), 'aprovado: assinatura antiga conta';
    ASSERT NOT public.fn_ad_track_v2('smk-b', v_ok, '/', 'impression', v_vis), 'aprovado em OUTRO espaço não conta';
    ASSERT NOT public.fn_ad_track('smk-b', v_ok, '/', 'click'), 'outro espaço (antiga) não conta';
    ASSERT NOT public.fn_ad_track_v2('smk-a', v_pend, '/', 'impression', v_vis), 'na fila não conta';
    ASSERT NOT public.fn_ad_track('smk-a', v_pend, '/', 'click'), 'na fila (antiga) não conta';
    ASSERT NOT public.fn_ad_track_v2('smk-a', v_rej, '/', 'impression', v_vis), 'reprovado não conta';
    ASSERT NOT public.fn_ad_track_v2('smk-a', v_exp, '/', 'impression', v_vis), 'campanha expirada não conta';
    ASSERT NOT public.fn_ad_track_v2('smk-a', v_stop, '/', 'impression', v_vis), 'campanha parada não conta';
    SELECT count(*) INTO v_n FROM public.ad_track_seen WHERE creative_id IN (v_pend, v_rej, v_exp, v_stop);
    ASSERT v_n = 0, 'rejeitado não ocupa a vaga de dedup';
    SELECT impressions INTO v_n FROM public.ad_stats_daily WHERE slot_slug = 'smk-a' AND creative_id = v_ok AND page = '/';
    ASSERT v_n = 2, 'contador do anunciante = 2';
  ELSE
    RAISE NOTICE 'plugin marketing ausente — casos de campanha pulados';
  END IF;

  -- anônimo: executa as duas funções, não toca na tabela de controle
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  SET LOCAL ROLE anon;
  ASSERT public.fn_ad_track_v2('smk-a', v_own, '/', 'impression', repeat('ef', 16)), 'anon executa v2';
  ASSERT NOT public.fn_ad_track_v2('smk-a', gen_random_uuid(), '/', 'impression', repeat('ef', 16)), 'anon: criativo inexistente → false sem erro';
  BEGIN
    PERFORM 1 FROM public.ad_track_seen;
    RAISE EXCEPTION 'esperava erro';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RESET ROLE;

  RAISE NOTICE 'ads 0002 OK';
END $$;
ROLLBACK;
