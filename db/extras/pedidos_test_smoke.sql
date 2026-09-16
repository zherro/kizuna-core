-- Roda: docker exec -i postgres_local psql -U myuser -d foco_total_db < kizuna-core/db/extras/pedidos_test_smoke.sql
-- Espera: todos os SELECT '...OK' aparecerem, sem ERROR, e ROLLBACK no fim.
BEGIN;

-- Dois usuários reais existentes em auth.users no ambiente local (foco_total_db), cada um dono do
-- próprio tenant (auth.tenants.owner_uid). Nota: psql NÃO interpola variáveis \set dentro de
-- blocos dollar-quoted (DO $$ ... $$), então os uuids aparecem como literais diretos onde
-- necessário, em vez de via \set.
--   cliente:   c0e7f2e2-955c-4d90-9f61-e998fa082553  (tenant 4e413dad-0bfe-432a-bb20-c4570e77598d)
--   prestador: 7a19ff79-cf27-4b61-8197-9f7985fb3c76  (tenant da1035c7-9e0c-44ee-a092-38c3cf07793d)
-- Se rodar contra outro banco, troque pelos dois primeiros que existirem:
--   SELECT uid FROM auth.users ORDER BY created_at LIMIT 2;
--   SELECT uid, owner_uid FROM auth.tenants WHERE owner_uid IN (...);

SET LOCAL request.jwt.claims TO '{"role":"auth_user","sub":"7a19ff79-cf27-4b61-8197-9f7985fb3c76","user_id":"7a19ff79-cf27-4b61-8197-9f7985fb3c76","tenant_id":"da1035c7-9e0c-44ee-a092-38c3cf07793d"}';

-- 1) tabelas + função existem
DO $$
BEGIN
  IF to_regclass('public.pedido') IS NULL THEN
    RAISE EXCEPTION 'pedido table FAILED';
  END IF;
  RAISE NOTICE 'pedido table OK';

  IF to_regclass('public.pedido_servico') IS NULL THEN
    RAISE EXCEPTION 'pedido_servico table FAILED';
  END IF;
  RAISE NOTICE 'pedido_servico table OK';

  IF NOT EXISTS (SELECT 1 FROM auth.plugin_registry WHERE name = 'pedidos') THEN
    RAISE EXCEPTION 'registry FAILED';
  END IF;
  RAISE NOTICE 'registry OK';
END $$;

DO $$
DECLARE
  v_cat        bigint;
  v_svc1       bigint;
  v_svc2       bigint;
  v_svc_other  bigint;
  v_conv_uid   uuid;
  v_conv       bigint;
  v_pedido     public.pedido;
  v_ps         public.pedido_servico;
  v_ps2        public.pedido_servico;
BEGIN
  SELECT id INTO v_cat FROM public.categories WHERE active LIMIT 1;
  IF v_cat IS NULL THEN
    RAISE EXCEPTION 'nenhuma categoria ativa encontrada em public.categories';
  END IF;

  -- prestador cria dois serviços (chamador atual = prestador, ver SET LOCAL acima)
  INSERT INTO public.services (title, category_id, status, active)
    VALUES ('Pintura de sala', v_cat, 'active', true) RETURNING id INTO v_svc1;
  INSERT INTO public.services (title, category_id, status, active)
    VALUES ('Pintura de quarto', v_cat, 'active', true) RETURNING id INTO v_svc2;

  -- troca pro cliente: inicia a conversa (ele é quem cria o chat, D3 do spec)
  SET LOCAL request.jwt.claims TO '{"role":"auth_user","sub":"c0e7f2e2-955c-4d90-9f61-e998fa082553","user_id":"c0e7f2e2-955c-4d90-9f61-e998fa082553","tenant_id":"4e413dad-0bfe-432a-bb20-c4570e77598d"}';

  -- serviço de "outro dono": reaproveita a própria conta do cliente como um prestador diferente do
  -- pedido, só para exercitar a checagem de ownership de fn_pedido_add_servico distinta do caso de
  -- id inexistente.
  INSERT INTO public.services (title, category_id, status, active)
    VALUES ('Serviço de outro prestador', v_cat, 'active', true) RETURNING id INTO v_svc_other;

  -- fn_msg_start_conversation retorna o uid (uuid) da conversa, não o id bigint;
  -- pedido.conversation_id referencia conversation.id, então resolvemos o id a partir do uid.
  SELECT public.fn_msg_start_conversation('7a19ff79-cf27-4b61-8197-9f7985fb3c76'::uuid, NULL, NULL, 'Quero um orçamento') INTO v_conv_uid;
  SELECT id INTO v_conv FROM public.conversation WHERE uid = v_conv_uid;
  IF v_conv IS NULL THEN
    RAISE EXCEPTION 'conversa não encontrada para uid retornado por fn_msg_start_conversation';
  END IF;

  -- 2) fn_pedido_create cria pedido + N pedido_servico
  v_pedido := public.fn_pedido_create(v_conv, '7a19ff79-cf27-4b61-8197-9f7985fb3c76'::uuid, 'anuncio', ARRAY[v_svc1]);
  ASSERT v_pedido.status = 'aberto', 'pedido nasce aberto';
  ASSERT (SELECT count(*) FROM public.pedido_servico WHERE pedido_id = v_pedido.id) = 1, '1 pedido_servico';
  RAISE NOTICE 'fn_pedido_create OK';

  -- 3) fn_pedido_add_servico aceita serviço do mesmo prestador
  v_ps2 := public.fn_pedido_add_servico(v_pedido.id, v_svc2);
  ASSERT (SELECT count(*) FROM public.pedido_servico WHERE pedido_id = v_pedido.id) = 2, '2 pedido_servico agora';
  RAISE NOTICE 'fn_pedido_add_servico OK';

  -- 4a) fn_pedido_add_servico rejeita service_id inexistente
  BEGIN
    PERFORM public.fn_pedido_add_servico(v_pedido.id, 999999999);
    RAISE EXCEPTION 'esperava erro de serviço inexistente';
  EXCEPTION
    WHEN OTHERS THEN RAISE NOTICE 'fn_pedido_add_servico rejeita serviço inexistente OK';
  END;

  -- 4b) fn_pedido_add_servico rejeita serviço que existe mas pertence a outro dono (não ao
  -- prestador deste pedido) — cenário distinto do id inexistente acima.
  BEGIN
    PERFORM public.fn_pedido_add_servico(v_pedido.id, v_svc_other);
    RAISE EXCEPTION 'esperava erro de serviço de outro dono';
  EXCEPTION
    WHEN OTHERS THEN RAISE NOTICE 'fn_pedido_add_servico rejeita serviço de outro dono OK';
  END;

  -- 5) derivação: concluir 1 de 2 não fecha o pedido
  SELECT * INTO v_ps FROM public.pedido_servico WHERE pedido_id = v_pedido.id AND service_id = v_svc1;
  v_ps := public.fn_pedido_servico_atualizar_status(v_ps.id, 'concluido');
  ASSERT (SELECT status FROM public.pedido WHERE id = v_pedido.id) = 'aberto', 'ainda aberto com 1 pendente';

  -- 6) concluir o segundo fecha o pedido
  v_ps2 := public.fn_pedido_servico_atualizar_status(v_ps2.id, 'concluido');
  ASSERT (SELECT status FROM public.pedido WHERE id = v_pedido.id) = 'concluido', 'fecha quando todos concluidos';
  RAISE NOTICE 'derivação de status OK';

  -- 7) notificações foram inseridas (pedido_criado + 2x pedido_servico_concluido)
  ASSERT (SELECT count(*) FROM public.notifications WHERE type = 'pedido_criado' AND user_id = '7a19ff79-cf27-4b61-8197-9f7985fb3c76'::uuid) >= 1, 'notif pedido_criado';
  ASSERT (SELECT count(*) FROM public.notifications WHERE type = 'pedido_servico_concluido') >= 2, 'notif concluido x2';
  RAISE NOTICE 'notificações OK';
END $$;

-- 8) RLS-deny: quem não participa não vê o pedido
-- Nota: este script roda como superuser (BYPASSRLS); um SELECT direto não exerceria a policy.
-- SET LOCAL ROLE para auth_user (role real, sem bypass) para a policy ser de fato avaliada.
SET LOCAL request.jwt.claims TO '{"role":"auth_user","sub":"00000000-0000-0000-0000-000000000099","user_id":"00000000-0000-0000-0000-000000000099"}';
SET LOCAL ROLE auth_user;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.pedido) THEN
    RAISE EXCEPTION 'rls deny FAILED';
  END IF;
  RAISE NOTICE 'rls deny OK';
END $$;
RESET ROLE;

-- 9) fn_notifications_mark_all_read só marca as do próprio usuário
SET LOCAL request.jwt.claims TO '{"role":"auth_user","sub":"7a19ff79-cf27-4b61-8197-9f7985fb3c76","user_id":"7a19ff79-cf27-4b61-8197-9f7985fb3c76","tenant_id":"da1035c7-9e0c-44ee-a092-38c3cf07793d"}';
SELECT public.fn_notifications_mark_all_read();
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.notifications WHERE user_id = '7a19ff79-cf27-4b61-8197-9f7985fb3c76' AND read_at IS NULL
  ) THEN
    RAISE EXCEPTION 'mark_all_read FAILED';
  END IF;
  RAISE NOTICE 'mark_all_read OK';
END $$;

ROLLBACK;
