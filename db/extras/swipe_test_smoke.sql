-- Roda: docker exec -i postgres_local psql -U myuser -d <db> < kizuna-core/db/extras/swipe_test_smoke.sql
-- Espera: NOTICEs '... OK', sem ERROR, ROLLBACK no fim. Requer ao menos 3 services ativos
-- (e ao menos 2 preços distintos > 0 entre os 50 primeiros do deck).
BEGIN;
SET LOCAL request.jwt.claims TO '{"role":"auth_user","sub":"c0e7f2e2-955c-4d90-9f61-e998fa082553","user_id":"c0e7f2e2-955c-4d90-9f61-e998fa082553","tenant_id":"da1035c7-9e0c-44ee-a092-38c3cf07793d"}';
SET LOCAL ROLE auth_user;

DO $$
DECLARE
  v_all uuid[];
  v_deck uuid[];
  v_a uuid; v_b uuid; v_c uuid;
  v_pmin numeric; v_pmax numeric;
BEGIN
  SELECT array_agg(uid) INTO v_all
    FROM public.fn_swipe_deck(NULL, NULL, NULL, NULL, NULL, NULL, 0.5, 50, NULL, NULL);
  ASSERT coalesce(array_length(v_all, 1), 0) >= 3, 'precisa de >= 3 services ativos';
  v_a := v_all[1]; v_b := v_all[2]; v_c := v_all[3];

  -- curtir A, passar B
  ASSERT public.fn_swipe_record(ARRAY[v_a], 'like') = 1, 'record like';
  ASSERT public.fn_swipe_record(ARRAY[v_b], 'skip') = 1, 'record skip';

  -- p_exclude remove C
  SELECT array_agg(uid) INTO v_deck
    FROM public.fn_swipe_deck(NULL, NULL, NULL, NULL, NULL, NULL, 0.5, 50, NULL, ARRAY[v_c]);
  ASSERT NOT (v_a = ANY(v_deck)), 'curtido fora do deck';
  ASSERT NOT (v_b = ANY(v_deck)), 'passado recente fora do deck';
  ASSERT NOT (v_c = ANY(v_deck)), 'p_exclude respeitado';
  RAISE NOTICE 'deck exclusions OK';

  -- passado antigo volta (o RLS permite ao dono atualizar a própria linha)
  UPDATE public.service_swipes SET updated_at = now() - interval '30 days' WHERE service_uid = v_b;
  SELECT array_agg(uid) INTO v_deck
    FROM public.fn_swipe_deck(NULL, NULL, NULL, NULL, NULL, NULL, 0.5, 50, NULL, NULL);
  ASSERT v_b = ANY(v_deck), 'passado apos TTL volta';
  ASSERT NOT (v_a = ANY(v_deck)), 'curtido nunca volta';
  RAISE NOTICE 'skip ttl OK';

  -- curtidos
  ASSERT (SELECT count(*) FROM public.fn_swipe_liked(NULL, 20) WHERE uid = v_a) = 1, 'liked lista A';
  -- skip nunca rebaixa um like (ex.: passados do anônimo migrados no login)
  PERFORM public.fn_swipe_record(ARRAY[v_a], 'skip');
  ASSERT (SELECT action FROM public.service_swipes WHERE service_uid = v_a) = 'like', 'skip apos like mantem like';
  ASSERT (SELECT count(*) FROM public.fn_swipe_liked(NULL, 20) WHERE uid = v_a) = 1, 'skip nao descurte';
  RAISE NOTICE 'skip keeps like OK';
  -- descurtir = unlike (grava skip)
  ASSERT public.fn_swipe_record(ARRAY[v_a], 'unlike') = 1, 'record unlike';
  ASSERT (SELECT action FROM public.service_swipes WHERE service_uid = v_a) = 'skip', 'unlike grava skip';
  ASSERT (SELECT count(*) FROM public.fn_swipe_liked(NULL, 20) WHERE uid = v_a) = 0, 'descurtir';
  RAISE NOTICE 'liked OK';

  -- faixa de preço: mesma semântica do /busca (sem preço / <= 0 = "Sob consulta" passa sempre)
  SELECT min(price), max(price) INTO v_pmin, v_pmax
    FROM public.fn_swipe_deck(NULL, NULL, NULL, NULL, NULL, NULL, 0.5, 50, NULL, NULL) WHERE price > 0;
  ASSERT v_pmin IS NOT NULL AND v_pmax > v_pmin, 'precisa de >= 2 services com precos diferentes';
  ASSERT NOT EXISTS (
    SELECT 1 FROM public.fn_swipe_deck(NULL, NULL, NULL, NULL, NULL, NULL, 0.5, 50, NULL, NULL,
                                       p_price_max => v_pmin)
    WHERE price > v_pmin
  ), 'p_price_max corta acima do teto';
  ASSERT NOT EXISTS (
    SELECT 1 FROM public.fn_swipe_deck(NULL, NULL, NULL, NULL, NULL, NULL, 0.5, 50, NULL, NULL,
                                       p_price_min => v_pmax)
    WHERE price > 0 AND price < v_pmax
  ), 'p_price_min corta abaixo do piso';
  ASSERT (
    SELECT count(*) FROM public.fn_swipe_deck(NULL, NULL, NULL, NULL, NULL, NULL, 0.5, 50, NULL, NULL,
                                              p_price_min => v_pmax)
    WHERE price = v_pmax
  ) >= 1, 'p_price_min mantem o piso';
  RAISE NOTICE 'price range OK';

  -- action inválida
  BEGIN
    PERFORM public.fn_swipe_record(ARRAY[v_c], 'love');
    RAISE EXCEPTION 'esperava erro de action invalida';
  EXCEPTION WHEN invalid_parameter_value THEN RAISE NOTICE 'invalid action OK';
  END;
END $$;

-- RLS: outro usuário não vê as linhas
SET LOCAL request.jwt.claims TO '{"role":"auth_user","sub":"7a19ff79-cf27-4b61-8197-9f7985fb3c76","user_id":"7a19ff79-cf27-4b61-8197-9f7985fb3c76","tenant_id":"da1035c7-9e0c-44ee-a092-38c3cf07793d"}';
DO $$ BEGIN
  ASSERT (SELECT count(*) FROM public.service_swipes WHERE user_id = 'c0e7f2e2-955c-4d90-9f61-e998fa082553') = 0, 'rls';
  RAISE NOTICE 'rls OK';
END $$;

-- anônimo: deck funciona, record falha
RESET ROLE;
SET LOCAL request.jwt.claims TO '{"role":"anon"}';
SET LOCAL ROLE anon;
DO $$ BEGIN
  PERFORM 1 FROM public.fn_swipe_deck(NULL, NULL, NULL, NULL, NULL, NULL, 0.5, 5, NULL, NULL);
  RAISE NOTICE 'anon deck OK';
END $$;

ROLLBACK;
