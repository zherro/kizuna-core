-- 0117_service_role_and_account_deletion.sql
-- 1) `service_role`: papel do servidor para operações privilegiadas feitas em TypeScript (excluir
--    conta, abrir ticket do sistema, checar revogação de sessão). BYPASSRLS + GRANTs mínimos —
--    nenhuma função nova. O JWT `{ "role": "service_role" }` (`kizuna token service`) fica só no
--    servidor, em POSTGREST_SERVICE_TOKEN. GRANTs em tabelas de plugins ficam nos próprios
--    plugins (o core não assume que eles existem).
-- 2) `auth.users.deleted_login`: e-mail original de uma conta excluída. O `login` vira
--    `deleted:<uid>:<email>` (libera o UNIQUE para recriar a conta); o cadastro acha a conta
--    antiga por igualdade exata neste campo.
-- Idempotente.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END
$$;

GRANT service_role TO authenticator;
GRANT USAGE ON SCHEMA auth, public TO service_role;

GRANT SELECT, UPDATE ON TABLE auth.users TO service_role;
GRANT SELECT, DELETE ON TABLE auth.user_identities TO service_role;
GRANT SELECT ON TABLE auth.tenants TO service_role;

ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS deleted_login text;

CREATE INDEX IF NOT EXISTS users_deleted_login_idx
  ON auth.users (deleted_login)
  WHERE deleted_at IS NOT NULL;

NOTIFY pgrst, 'reload schema';
