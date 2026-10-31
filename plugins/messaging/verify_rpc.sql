-- Teste funcional dos RPCs simulando dois usuários. Roda inteiro numa transação que dá rollback
-- proposital no fim — não deixa nenhuma linha. Rodar com:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f verify_rpc.sql
--
-- Ruling R2: em vez de INSERT direto em auth.users (viola NOT NULL de password/etc.), usa
-- auth.fun_auth__signup_bootstrap(login, senha) do core — ela cria user + tenant + user_role.
DO $$
DECLARE
    u1 uuid; t1 uuid; u2 uuid;
    conv uuid; cid bigint; msg public.message;
BEGIN
    SELECT user_uid, tenant_uid INTO u1, t1 FROM auth.fun_auth__signup_bootstrap('msg_verify_a@x', 'x');
    SELECT user_uid            INTO u2      FROM auth.fun_auth__signup_bootstrap('msg_verify_b@x', 'x');

    -- sessão do u1
    PERFORM set_config('request.jwt.claims',
        json_build_object('user_id', u1, 'tenant_id', t1, 'role', 'auth_user')::text, true);

    conv := public.fn_msg_start_conversation(u2, 'service', '42', 'Olá!');
    SELECT id INTO cid FROM public.conversation WHERE uid = conv;

    -- idempotência: mesma chamada (pair, context) não cria conversa nova
    ASSERT public.fn_msg_start_conversation(u2, 'service', '42', NULL) = conv, 'start não idempotente';
    ASSERT (SELECT count(*) FROM public.conversation) = 1, 'criou conversa duplicada';

    -- dedup por client_token
    msg := public.fn_msg_send_message(cid, 'segunda', 'tok-1');
    ASSERT (public.fn_msg_send_message(cid, 'segunda', 'tok-1')).id = msg.id, 'client_token não dedupou';
    ASSERT (SELECT count(*) FROM public.message WHERE conversation_id = cid) = 2, 'contagem errada';

    -- u2 vê a conversa com 2 não-lidas (a primeira mensagem + 'segunda', ambas do u1)
    PERFORM set_config('request.jwt.claims',
        json_build_object('user_id', u2, 'tenant_id', t1, 'role', 'auth_user')::text, true);
    ASSERT (SELECT unread_count FROM public.fn_msg_list_conversations(30, NULL) WHERE id = cid) = 2, 'unread errado';

    PERFORM public.fn_msg_mark_read(cid, msg.id);
    ASSERT (SELECT unread_count FROM public.fn_msg_list_conversations(30, NULL) WHERE id = cid) = 0, 'mark_read falhou';

    RAISE NOTICE 'messaging verify_rpc OK';
    RAISE EXCEPTION 'rollback proposital';
EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'rollback proposital' THEN RAISE; END IF;
    RAISE NOTICE 'messaging verify_rpc OK (rolled back)';
END $$;
