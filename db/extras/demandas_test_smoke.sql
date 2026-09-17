-- kizuna-core/db/extras/demandas_test_smoke.sql
-- Smoke test único cobrindo o essencial do plugin demandas (RLS + as 3 RPCs do MVP).
BEGIN;

DO $$
DECLARE
  v_cliente        uuid;
  v_cliente_tenant uuid;
  v_prestador      uuid;
  v_category       bigint;
  v_service_1      bigint;
  v_demanda        public.demanda;
  v_proposta       public.demanda_proposta;
  v_visible        integer;
  v_servico_ct     integer;
BEGIN
  SELECT uid INTO v_cliente FROM auth.users LIMIT 1;
  SELECT s.id, s.created_by, s.category_id INTO v_service_1, v_prestador, v_category
    FROM public.services s WHERE s.created_by IS NOT NULL AND s.created_by <> v_cliente
      AND s.active AND s.status = 'active' LIMIT 1;

  IF v_cliente IS NULL OR v_prestador IS NULL THEN
    RAISE EXCEPTION 'fixture ausente: precisa de 1 cliente e 1 prestador com serviço ativo';
  END IF;

  SELECT uid INTO v_cliente_tenant FROM auth.tenants WHERE owner_uid = v_cliente;

  PERFORM set_config('request.jwt.claims', json_build_object('user_id', v_cliente, 'tenant_id', v_cliente_tenant)::text, true);
  SET LOCAL ROLE auth_user;
  v_demanda := public.fn_demanda_create(v_category, '{}'::jsonb);
  IF v_demanda.status <> 'pending' THEN
    RAISE EXCEPTION 'fn_demanda_create não nasceu pending';
  END IF;
  RESET ROLE;

  -- RLS: prestador não vê demanda pending.
  PERFORM set_config('request.jwt.claims', json_build_object('user_id', v_prestador)::text, true);
  SET LOCAL ROLE auth_user;
  SELECT count(*) INTO v_visible FROM public.demanda WHERE id = v_demanda.id;
  IF v_visible <> 0 THEN
    RAISE EXCEPTION 'prestador enxergou demanda pending (RLS vazando)';
  END IF;
  RESET ROLE;

  -- Moderação: fun_auth_has_perm lê o claim is_root do JWT (não uma tabela) — simula um root só
  -- pra este smoke test exercitar o resto do fluxo, sem precisar de um grant real fixture.
  PERFORM set_config('request.jwt.claims', json_build_object('user_id', v_cliente, 'tenant_id', v_cliente_tenant, 'is_root', true)::text, true);
  PERFORM public.fn_demanda_moderate(v_demanda.id, 'approved', 'ok');
  IF NOT EXISTS (SELECT 1 FROM public.demanda WHERE id = v_demanda.id AND status = 'aberta') THEN
    RAISE EXCEPTION 'fn_demanda_moderate não promoveu pra aberta';
  END IF;

  -- Agora o prestador vê e pode propor.
  PERFORM set_config('request.jwt.claims', json_build_object('user_id', v_prestador)::text, true);
  SET LOCAL ROLE auth_user;
  SELECT count(*) INTO v_visible FROM public.demanda WHERE id = v_demanda.id;
  IF v_visible <> 1 THEN
    RAISE EXCEPTION 'prestador com categoria compatível não enxergou demanda aberta';
  END IF;

  v_proposta := public.fn_demanda_propor(v_demanda.id, ARRAY[v_service_1], 'Posso ajudar!');
  SELECT count(*) INTO v_servico_ct FROM public.demanda_proposta_servico WHERE proposta_id = v_proposta.id;
  IF v_servico_ct <> 1 THEN
    RAISE EXCEPTION 'fn_demanda_propor não gravou o service_id esperado';
  END IF;
  RESET ROLE;

  -- Cliente enxerga a própria proposta recebida.
  PERFORM set_config('request.jwt.claims', json_build_object('user_id', v_cliente)::text, true);
  SET LOCAL ROLE auth_user;
  SELECT count(*) INTO v_visible FROM public.demanda_proposta WHERE id = v_proposta.id;
  IF v_visible <> 1 THEN
    RAISE EXCEPTION 'cliente não enxergou a proposta recebida na própria demanda';
  END IF;
  RESET ROLE;

  RAISE NOTICE 'demandas plugin (MVP) OK';
END;
$$;

ROLLBACK;
