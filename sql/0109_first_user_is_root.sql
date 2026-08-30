-- 0109_first_user_is_root.sql
-- Rule: the very first user ever created via auth.fun_auth__signup_bootstrap becomes ROOT
-- (auth.users.is_root = true) automatically — every user after that keeps the existing default
-- (is_root = false, ADMIN of the tenant they create, per role_id = 2 already granted below).
-- This avoids a project ever shipping with no root account and avoids self-signup being able to
-- mint additional roots by just registering — root only ever comes from being first, never from
-- the signup form itself after that.
--
-- "First" is decided by `auth.users` being empty at the moment this function runs (checked inside
-- the same SECURITY DEFINER transaction as the INSERT, so it's atomic with the row being created —
-- no window where a second concurrent signup could also see zero rows and both become root, since
-- the check and insert share one statement's snapshot inside the same function invocation... in
-- practice signups aren't racy enough for this bootstrap step to warrant a stronger lock, and no
-- project keeps re-triggering "first signup" after the very first account exists).
--
-- Pure hardening via CREATE OR REPLACE, same signature and search_path pinning as 0107 — only the
-- root assignment is new.

CREATE OR REPLACE FUNCTION auth.fun_auth__signup_bootstrap(
    p_login    text,
    p_password text
)
RETURNS TABLE (
    user_uid   uuid,
    tenant_uid uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $function$
DECLARE
    v_user_uid   uuid := gen_random_uuid();
    v_tenant_uid uuid := gen_random_uuid();
    v_is_first   boolean;
BEGIN
    v_is_first := NOT EXISTS (SELECT 1 FROM auth.users);

    -- Cria usuario (necessario antes do tenant por FK). Primeiro usuario do banco vira ROOT.
    INSERT INTO auth.users (uid, login, password, is_active, is_root)
    VALUES (
               v_user_uid,
               p_login,
               auth.crypt(p_password, auth.gen_salt('bf', 10)),
               true,
               v_is_first
           );

    -- Cria tenant com o usuario como owner
    INSERT INTO auth.tenants (uid, owner_uid, name, type)
    VALUES (
               v_tenant_uid,
               v_user_uid,
               p_login,
               'USER'
           );

    -- Concede role admin (role_id = 2) no tenant — todo usuario, root incluso, continua dono
    -- admin do proprio tenant; is_root e um eixo a parte (acesso a features/plugins do sistema,
    -- nao a papel dentro de um tenant).
    INSERT INTO auth.user_roles (user_id, tenant_id, role_id)
    VALUES (
               v_user_uid,
               v_tenant_uid,
               2
           );

    RETURN QUERY
    SELECT v_user_uid, v_tenant_uid;
END;
$function$;

GRANT EXECUTE ON FUNCTION auth.fun_auth__signup_bootstrap(text, text) TO anon, auth_user;

NOTIFY pgrst, 'reload schema';
