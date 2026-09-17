-- kizuna-core/db/extras/pedido_iniciar_por_demanda_test_smoke.sql
BEGIN;

DO $$
DECLARE
  v_cliente        uuid;
  v_cliente_tenant uuid;
  v_prestador      uuid;
  v_category       bigint;
  v_service_1      bigint;
  v_service_2      bigint;
  v_demanda        public.demanda;
  v_proposta       public.demanda_proposta;
  v_result         record;
BEGIN
  SELECT uid INTO v_cliente FROM auth.users LIMIT 1;
  SELECT s.id, s.created_by, s.category_id INTO v_service_1, v_prestador, v_category
    FROM public.services s WHERE s.created_by IS NOT NULL AND s.created_by <> v_cliente
      AND s.active AND s.status = 'active' LIMIT 1;
  SELECT id INTO v_service_2 FROM public.services
   WHERE created_by = v_prestador AND id <> v_service_1 AND active AND status = 'active' LIMIT 1;

  IF v_cliente IS NULL OR v_prestador IS NULL THEN
    RAISE EXCEPTION 'fixture ausente: precisa de 1 cliente e 1 prestador com serviço ativo';
  END IF;
  SELECT uid INTO v_cliente_tenant FROM auth.tenants WHERE owner_uid = v_cliente;

  PERFORM set_config('request.jwt.claims', json_build_object('user_id', v_cliente, 'tenant_id', v_cliente_tenant)::text, true);
  SET LOCAL ROLE auth_user;
  v_demanda := public.fn_demanda_create(v_category, '{}'::jsonb);
  RESET ROLE;

  PERFORM set_config('request.jwt.claims', json_build_object('user_id', v_cliente, 'tenant_id', v_cliente_tenant, 'is_root', true)::text, true);
  PERFORM public.fn_demanda_moderate(v_demanda.id, 'approved');

  PERFORM set_config('request.jwt.claims', json_build_object('user_id', v_prestador)::text, true);
  SET LOCAL ROLE auth_user;
  v_proposta := public.fn_demanda_propor(v_demanda.id, ARRAY[v_service_1], 'Posso ajudar!');
  RESET ROLE;

  PERFORM set_config('request.jwt.claims', json_build_object('user_id', v_cliente, 'tenant_id', v_cliente_tenant)::text, true);
  SET LOCAL ROLE auth_user;

  IF v_service_2 IS NOT NULL THEN
    BEGIN
      PERFORM public.fn_pedido_iniciar_por_demanda(v_proposta.id, ARRAY[v_service_2], 'x');
      RAISE EXCEPTION 'aceitou service_id fora da proposta';
    EXCEPTION WHEN OTHERS THEN
      IF SQLSTATE <> '22023' THEN RAISE; END IF;
    END;
  END IF;

  SELECT * INTO v_result FROM public.fn_pedido_iniciar_por_demanda(
    v_proposta.id, ARRAY[v_service_1], 'Aceitei sua proposta!'
  );
  IF v_result.pedido_uid IS NULL OR v_result.conversation_uid IS NULL THEN
    RAISE EXCEPTION 'fn_pedido_iniciar_por_demanda não retornou pedido_uid/conversation_uid';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.pedido WHERE uid = v_result.pedido_uid AND demanda_id = v_demanda.id AND origem = 'demanda'
  ) THEN
    RAISE EXCEPTION 'pedido criado não tem demanda_id/origem corretos';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.demanda_proposta WHERE id = v_proposta.id AND status = 'aceita') THEN
    RAISE EXCEPTION 'proposta aceita não foi marcada como aceita';
  END IF;

  RESET ROLE;
  RAISE NOTICE 'fn_pedido_iniciar_por_demanda OK';
END;
$$;

ROLLBACK;
