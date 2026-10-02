-- plugins/services/0007_services_service_role.sql
-- A exclusão de conta (core, TypeScript com service_role — sql/0117) desativa os anúncios do
-- usuário. Só GRANT; sem o papel (core antigo), não faz nada. Idempotente.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT SELECT, UPDATE ON TABLE public.services TO service_role;
  END IF;
END
$$;

NOTIFY pgrst, 'reload schema';
