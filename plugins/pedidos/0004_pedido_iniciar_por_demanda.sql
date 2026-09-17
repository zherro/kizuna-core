-- plugins/pedidos/0004_pedido_iniciar_por_demanda.sql
-- Bloco 4: aceitar uma demanda_proposta cria pedido + conversation atomicamente, igual ao Bloco 2
-- (fn_pedido_iniciar_por_servico), mas o prestador vem da proposta (não de services.created_by
-- direto), os service_ids precisam ser subconjunto do que a proposta ofereceu, e as respostas do
-- formulário já capturadas na demanda são copiadas (não pedidas de novo) pro pedido. Design:
-- foco-total/docs/superpowers/specs/2026-09-15-demanda-e-propostas-design.md §4

ALTER TABLE public.pedido ADD COLUMN IF NOT EXISTS demanda_id bigint REFERENCES public.demanda(id);

CREATE OR REPLACE FUNCTION public.fn_pedido_iniciar_por_demanda(
  p_proposta_id bigint,
  p_service_ids bigint[],
  p_resumo      text
) RETURNS TABLE (pedido_uid uuid, conversation_uid uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
  v_me           uuid := auth.fun_auth_user_id();
  v_demanda_id   bigint;
  v_demanda_uid  uuid;
  v_cliente_id   uuid;
  v_prestador_id uuid;
  v_bad_ct       integer;
  v_conv         public.conversation%ROWTYPE;
  v_pedido       public.pedido;
  v_form_row     record;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'sem sessão' USING errcode = '42501';
  END IF;
  IF p_service_ids IS NULL OR array_length(p_service_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'pedido precisa de pelo menos 1 serviço' USING errcode = '22023';
  END IF;

  SELECT dp.demanda_id, dp.prestador_id, d.uid, d.cliente_id
    INTO v_demanda_id, v_prestador_id, v_demanda_uid, v_cliente_id
    FROM public.demanda_proposta dp
    JOIN public.demanda d ON d.id = dp.demanda_id
   WHERE dp.id = p_proposta_id;

  IF v_demanda_id IS NULL THEN
    RAISE EXCEPTION 'proposta não encontrada' USING errcode = '22023';
  END IF;
  IF v_cliente_id <> v_me THEN
    RAISE EXCEPTION 'forbidden' USING errcode = '42501';
  END IF;

  SELECT count(*) INTO v_bad_ct
    FROM unnest(p_service_ids) sid
    LEFT JOIN public.demanda_proposta_servico dps
      ON dps.service_id = sid AND dps.proposta_id = p_proposta_id
   WHERE dps.id IS NULL;
  IF v_bad_ct > 0 THEN
    RAISE EXCEPTION 'todo service_id precisa estar na proposta' USING errcode = '22023';
  END IF;

  SELECT c.* INTO v_conv
    FROM public.conversation c
    JOIN public.conversation_participant p1 ON p1.conversation_id = c.id AND p1.user_id = v_me AND p1.active
    JOIN public.conversation_participant p2 ON p2.conversation_id = c.id AND p2.user_id = v_prestador_id AND p2.active
   WHERE c.status = 'open'
     AND c.context_type = 'demanda'
     AND c.context_id = v_demanda_uid::text
   ORDER BY c.id DESC
   LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.conversation (context_type, context_id, created_by, tenant_id)
    VALUES ('demanda', v_demanda_uid::text, v_me, auth.fun_auth_current_tenant_id())
    RETURNING * INTO v_conv;
    INSERT INTO public.conversation_participant (conversation_id, user_id, role)
    VALUES (v_conv.id, v_me, 'owner'), (v_conv.id, v_prestador_id, 'member');
  END IF;

  IF p_resumo IS NOT NULL AND length(trim(p_resumo)) > 0 THEN
    INSERT INTO public.message (conversation_id, sender_id, source, direction, content, status)
    VALUES (v_conv.id, v_me, 'platform', 'outbound', p_resumo, 'sent');
  END IF;

  v_pedido := public.fn_pedido_create(v_conv.id, v_prestador_id, 'demanda', p_service_ids);

  UPDATE public.pedido SET demanda_id = v_demanda_id WHERE id = v_pedido.id;

  UPDATE public.conversation SET context_type = 'pedido', context_id = v_pedido.uid::text
   WHERE id = v_conv.id;

  UPDATE public.demanda_proposta SET status = 'aceita', updated_at = now()
   WHERE id = p_proposta_id;

  SELECT fr.form_key, fr.answers INTO v_form_row
    FROM public.form_results fr WHERE fr.domain = 'demanda' AND fr.reference_id = v_demanda_uid::text;
  IF v_form_row.form_key IS NOT NULL THEN
    PERFORM public.fn_form_result_upsert(v_form_row.form_key, 'pedido', v_pedido.uid::text, v_form_row.answers);
  END IF;

  RETURN QUERY SELECT v_pedido.uid, v_conv.uid;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_pedido_iniciar_por_demanda(bigint, bigint[], text) TO auth_user;

NOTIFY pgrst, 'reload schema';
