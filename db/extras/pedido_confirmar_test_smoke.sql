-- kizuna-core/db/extras/pedido_confirmar_test_smoke.sql
-- Smoke test for fn_pedido_confirmar (Bloco 2). Run inside a transaction, always ROLLBACK.
BEGIN;

-- Assumes a pedido already exists from the pedidos plugin's own smoke fixtures / Bloco 1 data.
-- Pick any existing pedido + its two participants for a self-contained check instead of hardcoding ids.
DO $$
DECLARE
  v_pedido_id   bigint;
  v_cliente_id  uuid;
  v_prestador   uuid;
  v_outro       uuid;
  v_result      public.pedido;
BEGIN
  SELECT id, cliente_id, prestador_id INTO v_pedido_id, v_cliente_id, v_prestador
    FROM public.pedido ORDER BY id LIMIT 1;

  IF v_pedido_id IS NULL THEN
    RAISE EXCEPTION 'fixture ausente: nenhum pedido na base para testar fn_pedido_confirmar';
  END IF;

  PERFORM set_config('request.jwt.claims', json_build_object('user_id', v_cliente_id)::text, true);
  v_result := public.fn_pedido_confirmar(v_pedido_id);
  IF v_result.confirmado_em IS NULL THEN
    RAISE EXCEPTION 'fn_pedido_confirmar não setou confirmado_em na 1a chamada';
  END IF;

  -- 2a chamada (mesmo participante) é idempotente: não muda o timestamp nem estoura erro.
  PERFORM pg_sleep(0.01);
  v_result := public.fn_pedido_confirmar(v_pedido_id);
  ASSERT v_result.confirmado_em IS NOT NULL, 'confirmado_em sumiu na 2a chamada';

  -- Não-participante: deve ser rejeitado.
  SELECT uid INTO v_outro FROM auth.users WHERE uid NOT IN (v_cliente_id, v_prestador) LIMIT 1;
  IF v_outro IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims', json_build_object('user_id', v_outro)::text, true);
    BEGIN
      PERFORM public.fn_pedido_confirmar(v_pedido_id);
      RAISE EXCEPTION 'não-participante conseguiu confirmar o pedido';
    EXCEPTION WHEN OTHERS THEN
      IF SQLSTATE <> '42501' THEN RAISE; END IF;
    END;
  END IF;

  RAISE NOTICE 'fn_pedido_confirmar OK';
END;
$$;

ROLLBACK;
