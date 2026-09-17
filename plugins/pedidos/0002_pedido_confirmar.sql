-- plugins/pedidos/0002_pedido_confirmar.sql
-- Bloco 2 (solicitar-anuncio-pedido): coluna de confirmação do resumo do pedido + RPC idempotente
-- chamável por qualquer um dos dois participantes. Design:
-- foco-total/docs/superpowers/specs/2026-09-15-solicitar-anuncio-pedido-design.md §4

ALTER TABLE public.pedido ADD COLUMN IF NOT EXISTS confirmado_em timestamptz;

CREATE OR REPLACE FUNCTION public.fn_pedido_confirmar(p_pedido_id bigint) RETURNS public.pedido
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
  v_pedido public.pedido;
BEGIN
  IF NOT auth.fun_pedido_is_participant(p_pedido_id) THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  -- Idempotente: a segunda chamada (de qualquer um dos dois lados) não é erro, só devolve a
  -- linha já confirmada — evita corrida entre cliente e prestador clicando quase ao mesmo tempo.
  UPDATE public.pedido SET confirmado_em = now()
   WHERE id = p_pedido_id AND confirmado_em IS NULL
   RETURNING * INTO v_pedido;

  IF NOT FOUND THEN
    SELECT * INTO v_pedido FROM public.pedido WHERE id = p_pedido_id;
  END IF;

  IF v_pedido IS NULL THEN
    RAISE EXCEPTION 'pedido não encontrado' USING errcode = '22023';
  END IF;

  RETURN v_pedido;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_pedido_confirmar(bigint) TO auth_user;

NOTIFY pgrst, 'reload schema';
