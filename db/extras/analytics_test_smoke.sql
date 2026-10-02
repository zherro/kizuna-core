-- Roda: docker exec -i postgres_local psql -U myuser -d foco_total_db < kizuna-core/db/extras/analytics_test_smoke.sql
-- Espera: NOTICE 'analytics OK', sem ERROR, e ROLLBACK no fim. Precisa de 1 serviço ativo.
BEGIN;

DO $$
DECLARE
  v_uid uuid; v_tenant uuid; v_owner uuid; v_ok boolean; v_n integer;
BEGIN
  ASSERT to_regclass('public.analytics_events') IS NOT NULL, 'tabela existe';
  ASSERT EXISTS (SELECT 1 FROM auth.plugin_registry WHERE name = 'analytics'), 'plugin registrado';

  SELECT uid, tenant_id, created_by INTO v_uid, v_tenant, v_owner
    FROM public.services WHERE active LIMIT 1;
  IF v_uid IS NULL THEN RAISE NOTICE 'sem serviço ativo — smoke pulado'; RETURN; END IF;

  -- visitante anônimo (RLS de verdade: SET LOCAL ROLE anon)
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  SET LOCAL ROLE anon;

  v_ok := public.fn_analytics_track('service', v_uid, 'view', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'search', 1600);
  ASSERT v_ok, 'primeira view registra';
  v_ok := public.fn_analytics_track('service', v_uid, 'view', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'search', 1600);
  ASSERT NOT v_ok, 'mesma view no mesmo dia é ignorada';
  v_ok := public.fn_analytics_track('service', v_uid, 'view', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'home', 2000);
  ASSERT v_ok, 'outro visitante registra';
  v_ok := public.fn_analytics_track('service', v_uid, 'contact_click', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'search', 0);
  ASSERT v_ok, 'contato registra sem tempo';

  -- rejeições por CHECK / RLS (cada uma levanta erro)
  BEGIN PERFORM public.fn_analytics_track('service', v_uid, 'view', 'cccccccccccccccccccccccccccccccc', 'search', 100);
        RAISE EXCEPTION 'esperava check_violation (tempo abaixo do piso)';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN PERFORM public.fn_analytics_track('service', v_uid, 'nope', 'cccccccccccccccccccccccccccccccc', 'search', 2000);
        RAISE EXCEPTION 'esperava check_violation (evento)';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN PERFORM public.fn_analytics_track('service', v_uid, 'view', 'curto', 'search', 2000);
        RAISE EXCEPTION 'esperava check_violation (hash)';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN PERFORM public.fn_analytics_track('service', gen_random_uuid(), 'view', 'cccccccccccccccccccccccccccccccc', 'search', 2000);
        RAISE EXCEPTION 'esperava insufficient_privilege (entidade inexistente)';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  -- anon não lê
  BEGIN PERFORM 1 FROM public.analytics_events LIMIT 1;
        RAISE EXCEPTION 'anon não deveria ler';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;

  -- dono não conta o próprio anúncio
  PERFORM set_config('request.jwt.claims',
    json_build_object('role','auth_user','sub',v_owner,'user_id',v_owner,'tenant_id',v_tenant)::text, true);
  SET LOCAL ROLE auth_user;
  BEGIN PERFORM public.fn_analytics_track('service', v_uid, 'view', 'dddddddddddddddddddddddddddddddd', 'direct', 2000);
        RAISE EXCEPTION 'esperava insufficient_privilege (dono)';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  -- dono lê as linhas do próprio anúncio
  SELECT count(*) INTO v_n FROM public.analytics_events WHERE entity_id = v_uid;
  ASSERT v_n >= 3, 'dono lê os 3 eventos';
  RESET ROLE;

  -- outro tenant não vê
  PERFORM set_config('request.jwt.claims',
    json_build_object('role','auth_user','sub',gen_random_uuid(),'user_id',gen_random_uuid(),'tenant_id',gen_random_uuid())::text, true);
  SET LOCAL ROLE auth_user;
  SELECT count(*) INTO v_n FROM public.analytics_events WHERE entity_id = v_uid;
  ASSERT v_n = 0, 'outro tenant não vê';
  RESET ROLE;

  RAISE NOTICE 'analytics OK';
END $$;

ROLLBACK;
