/* ============================================================
   FUNCTION: auth.fun_auth_verify_is_admin
   ------------------------------------------------------------
   Verifica se o usuário autenticado possui a role ADMIN
   (auth.roles.name = 'ADMIN') no tenant atual, consultando
   auth.user_roles a partir do user_id e tenant_id do JWT.
   Compatível com PostgREST e uso em RLS.
   ============================================================ */

-- DROP FUNCTION auth.fun_auth_verify_is_admin();

CREATE OR REPLACE FUNCTION auth.fun_auth_verify_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $function$
SELECT EXISTS (
    SELECT 1
    FROM auth.user_roles ur
    JOIN auth.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.fun_auth_user_id()
      AND ur.tenant_id = auth.fun_auth_current_tenant_id()
      AND r.name = 'ADMIN'
);
$function$;

GRANT USAGE ON SCHEMA auth TO anon, auth_user;
GRANT EXECUTE ON FUNCTION auth.fun_auth_verify_is_admin() TO anon, auth_user;
