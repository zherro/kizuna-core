-- plugins/pedidos/0003_pedido_iniciar_por_servico.sql
-- Bloco 2: cria pedido + conversation atomicamente a partir de um anúncio. Reaproveita a conversa
-- "Falar com" existente pro mesmo serviço se houver uma aberta (mesma lógica de dedupe de
-- fn_msg_start_conversation) — assim "solicitar" dentro de um chat de dúvida já aberto vira o
-- mesmo pedido em vez de duplicar a conversa. Design:
-- foco-total/docs/superpowers/specs/2026-09-15-solicitar-anuncio-pedido-design.md §3

CREATE OR REPLACE FUNCTION public.fn_pedido_iniciar_por_servico(
  p_service_ids  bigint[],
  p_resumo       text,
  p_form_answers jsonb DEFAULT '{}'::jsonb
) RETURNS TABLE (pedido_uid uuid, conversation_uid uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $function$
DECLARE
  v_me           uuid := auth.fun_auth_user_id();
  v_prestador_id uuid;
  v_category_id  bigint;
  v_form_key     text;
  v_bad_ct       integer;
  v_conv         public.conversation%ROWTYPE;
  v_pedido       public.pedido;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'sem sessão' USING errcode = '42501';
  END IF;
  IF p_service_ids IS NULL OR array_length(p_service_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'pedido precisa de pelo menos 1 serviço' USING errcode = '22023';
  END IF;

  SELECT s.created_by, s.category_id INTO v_prestador_id, v_category_id
    FROM public.services s WHERE s.id = p_service_ids[1];
  IF v_prestador_id IS NULL THEN
    RAISE EXCEPTION 'serviço inválido' USING errcode = '22023';
  END IF;
  IF v_prestador_id = v_me THEN
    RAISE EXCEPTION 'não é possível solicitar o próprio anúncio' USING errcode = '22023';
  END IF;

  -- Mesma checagem de fn_pedido_create (I1 do review do Bloco 1): todo service_id precisa
  -- pertencer ao MESMO prestador — sem isso um pedido misturaria anúncios de donos diferentes.
  SELECT count(*) INTO v_bad_ct
    FROM unnest(p_service_ids) sid
    LEFT JOIN public.services s ON s.id = sid AND s.created_by = v_prestador_id
   WHERE s.id IS NULL;
  IF v_bad_ct > 0 THEN
    RAISE EXCEPTION 'todo service_id precisa pertencer ao mesmo prestador' USING errcode = '22023';
  END IF;

  SELECT c.* INTO v_conv
    FROM public.conversation c
    JOIN public.conversation_participant p1 ON p1.conversation_id = c.id AND p1.user_id = v_me AND p1.active
    JOIN public.conversation_participant p2 ON p2.conversation_id = c.id AND p2.user_id = v_prestador_id AND p2.active
   WHERE c.status = 'open'
     AND c.context_type = 'service'
     AND c.context_id = p_service_ids[1]::text
   ORDER BY c.id DESC
   LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.conversation (context_type, context_id, created_by, tenant_id)
    VALUES ('service', p_service_ids[1]::text, v_me, auth.fun_auth_current_tenant_id())
    RETURNING * INTO v_conv;
    INSERT INTO public.conversation_participant (conversation_id, user_id, role)
    VALUES (v_conv.id, v_me, 'owner'), (v_conv.id, v_prestador_id, 'member');
  END IF;

  IF p_resumo IS NOT NULL AND length(trim(p_resumo)) > 0 THEN
    INSERT INTO public.message (conversation_id, sender_id, source, direction, content, status)
    VALUES (v_conv.id, v_me, 'platform', 'outbound', p_resumo, 'sent');
  END IF;

  -- Reaproveita a validação/inserts já especificados no Bloco 1 em vez de duplicá-los aqui.
  v_pedido := public.fn_pedido_create(v_conv.id, v_prestador_id, 'anuncio', p_service_ids);

  -- Só agora o pedido existe: promove a conversa de "dúvida sobre um serviço" pra "pedido".
  UPDATE public.conversation SET context_type = 'pedido', context_id = v_pedido.uid::text
   WHERE id = v_conv.id;

  IF v_category_id IS NOT NULL AND p_form_answers IS NOT NULL AND p_form_answers <> '{}'::jsonb THEN
    SELECT c.request_form_key INTO v_form_key FROM public.categories c WHERE c.id = v_category_id;
    IF v_form_key IS NOT NULL THEN
      PERFORM public.fn_form_result_upsert(v_form_key, 'pedido', v_pedido.uid::text, p_form_answers);
    END IF;
  END IF;

  RETURN QUERY SELECT v_pedido.uid, v_conv.uid;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_pedido_iniciar_por_servico(bigint[], text, jsonb) TO auth_user;

NOTIFY pgrst, 'reload schema';
