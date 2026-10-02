-- plugins/notifications/0003_notifications_service_role.sql
-- O servidor (service_role — sql/0117) avisa usuários pela função que já existe, auth.fun_notify
-- (resolve o tenant do destinatário). Só GRANT; sem o papel, não faz nada. Idempotente.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION auth.fun_notify(uuid, text, text, text, text, text) TO service_role;
  END IF;
END
$$;

NOTIFY pgrst, 'reload schema';
