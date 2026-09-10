-- Asserções pós-install. Rodar com: psql "$DB_URL" -v ON_ERROR_STOP=1 -f verify.sql
DO $$
BEGIN
    ASSERT (SELECT count(*) FROM information_schema.tables
            WHERE table_schema='public' AND table_name IN
            ('conversation','conversation_participant','message','message_external_identity')) = 4,
           'faltam tabelas';
    ASSERT (SELECT count(*) FROM auth.plugin_registry WHERE name='messaging') = 1, 'plugin não registrado';
    ASSERT (SELECT count(*) FROM auth.permissions WHERE resource='messaging' AND action='manage') = 1, 'permissão não catalogada';
    ASSERT (SELECT count(*) FROM auth.role_grants g JOIN auth.permissions p ON p.id=g.permission_id
            WHERE p.resource='messaging') = 0, 'plugin não pode conceder permissão';
    ASSERT to_regprocedure('public.fn_msg_start_conversation(uuid,text,text,text)') IS NOT NULL, 'RPC start ausente';
    ASSERT to_regprocedure('public.fn_msg_send_message(bigint,text,text)') IS NOT NULL, 'RPC send ausente';
    ASSERT to_regprocedure('public.fn_msg_mark_read(bigint,bigint)') IS NOT NULL, 'RPC mark_read ausente';
    ASSERT to_regprocedure('public.fn_msg_list_conversations(int,timestamptz)') IS NOT NULL, 'RPC list ausente';
    ASSERT to_regprocedure('auth.fun_msg_is_participant(bigint)') IS NOT NULL, 'helper RLS ausente';
    RAISE NOTICE 'messaging verify OK';
END $$;
