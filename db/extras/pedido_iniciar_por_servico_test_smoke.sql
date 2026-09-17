-- kizuna-core/db/extras/pedido_iniciar_por_servico_test_smoke.sql
BEGIN;

DO $$
DECLARE
  v_cliente       uuid;
  v_cliente_tenant uuid;
  v_prestador     uuid;
  v_outro_prest   uuid;
  v_service_1     bigint;
  v_service_2     bigint;
  v_service_other bigint;
  v_result        record;
  v_conv_ct       integer;
BEGIN
  SELECT uid INTO v_cliente FROM auth.users LIMIT 1;
  SELECT s.id, s.created_by INTO v_service_1, v_prestador FROM public.services s
   WHERE s.created_by IS NOT NULL AND s.created_by <> v_cliente LIMIT 1;
  SELECT id INTO v_service_2 FROM public.services WHERE created_by = v_prestador AND id <> v_service_1 LIMIT 1;
  SELECT s.id, s.created_by INTO v_service_other, v_outro_prest FROM public.services s
   WHERE s.created_by IS NOT NULL AND s.created_by NOT IN (v_cliente, v_prestador) LIMIT 1;

  IF v_cliente IS NULL OR v_service_1 IS NULL THEN
    RAISE EXCEPTION 'fixture ausente: precisa de 1 cliente e >=1 serviço de outro dono';
  END IF;

  -- fn_form_result_upsert (chamado internamente quando há request_form_key) exige tenant_id no
  -- claims — o docker-exec/psql conecta como superuser, então precisamos montar o claims completo
  -- (mesmo padrão de kizuna-core/plugins/pedidos smoke tests).
  SELECT uid INTO v_cliente_tenant FROM auth.tenants WHERE owner_uid = v_cliente;
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('user_id', v_cliente, 'tenant_id', v_cliente_tenant)::text,
    true
  );

  SELECT * INTO v_result FROM public.fn_pedido_iniciar_por_servico(
    ARRAY[v_service_1], 'Olá, gostaria de solicitar este serviço.', '{"urgencia":"hoje"}'::jsonb
  );
  IF v_result.pedido_uid IS NULL OR v_result.conversation_uid IS NULL THEN
    RAISE EXCEPTION 'fn_pedido_iniciar_por_servico não retornou pedido_uid/conversation_uid';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.pedido WHERE uid = v_result.pedido_uid AND conversation_id = (
      SELECT id FROM public.conversation WHERE uid = v_result.conversation_uid
    )
  ) THEN
    RAISE EXCEPTION 'pedido criado não aponta pra conversation retornada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.conversation WHERE uid = v_result.conversation_uid
      AND context_type = 'pedido' AND context_id = v_result.pedido_uid::text
  ) THEN
    RAISE EXCEPTION 'conversation não foi promovida pra context_type=pedido';
  END IF;

  SELECT count(*) INTO v_conv_ct FROM public.pedido_servico ps
    JOIN public.pedido p ON p.id = ps.pedido_id WHERE p.uid = v_result.pedido_uid;
  IF v_conv_ct <> 1 THEN
    RAISE EXCEPTION 'pedido_servico não foi criado (esperado 1, achou %)', v_conv_ct;
  END IF;

  -- service_ids de donos diferentes deve ser rejeitado (22023).
  IF v_service_other IS NOT NULL THEN
    BEGIN
      PERFORM public.fn_pedido_iniciar_por_servico(
        ARRAY[v_service_1, v_service_other], 'x', '{}'::jsonb
      );
      RAISE EXCEPTION 'aceitou service_ids de donos diferentes';
    EXCEPTION WHEN OTHERS THEN
      IF SQLSTATE <> '22023' THEN RAISE; END IF;
    END;
  END IF;

  RAISE NOTICE 'fn_pedido_iniciar_por_servico OK';
END;
$$;

ROLLBACK;
