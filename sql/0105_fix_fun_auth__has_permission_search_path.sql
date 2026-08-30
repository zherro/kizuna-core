-- 0105_fix_fun_auth__has_permission_search_path.sql
-- Fixes risk #3 from the review: auth.fun_auth__has_permission referenced bare `tenants` (relying
-- on the calling role's session-level search_path, set separately in 0002) instead of the
-- schema-qualified `auth.tenants`, and had no SET search_path pinned on the function itself —
-- both are search-path-hijack risk patterns for a security-sensitive function. Pure bug fix via
-- CREATE OR REPLACE: same signature, same logic, only the two corrections below. This function
-- is legacy (superseded by fun_auth_has_perm going forward) but stays live until the cutover
-- migration, so it must not carry a known-fragile body in the meantime.

CREATE OR REPLACE FUNCTION auth.fun_auth__has_permission(
    p_resource text,
    p_action   text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = auth, public
AS $function$
DECLARE
    uid        uuid := auth.fun_auth_user_id();
    tid        uuid :=  auth.fun_auth_current_tenant_id();
    perm       boolean := false;
    jwt_perms jsonb := coalesce(
    	nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'perms',
    	'{}'::jsonb
	);    jwt_val    text;
    is_admin   boolean := false;
BEGIN
    -- 0) Verifica se é admin no tenant atual (role_id = 2)
SELECT auth.fun_auth_tenant_type_is('ADMIN') INTO is_admin;

-- Admin sempre autoriza imediatamente.
    IF is_admin THEN
        RETURN true;
    END IF;

    -- 1) Preferir permissões calculadas no JWT (atalho rápido)
    IF jwt_perms IS NOT NULL THEN
        jwt_val := (jwt_perms -> p_resource ->> p_action);
        IF jwt_val IS NOT NULL THEN
            RETURN COALESCE(jwt_val::boolean, false);
        END IF;
    END IF;

    -- 2) Avaliação via banco para não-admin: apenas permissões de grupo
SELECT bool_or(
               COALESCE((gp.permissions ->> p_action)::boolean, false)
       )
INTO perm
FROM auth.user_groups ug
         JOIN auth.group_permissions gp
              ON gp.tenant_id = ug.tenant_id
                  AND gp.group_id  = ug.group_id
                  AND gp.resource  = p_resource
WHERE ug.user_id  = uid
  AND ug.tenant_id = tid;

            -- 3) Override para owner em gestão de RBAC
    IF NOT COALESCE(perm, false)
       AND p_resource = 'rbac'
       AND (p_action = 'grant' OR p_action = 'configure')
    THEN
SELECT EXISTS (
    SELECT 1
    FROM auth.tenants t
    WHERE t.uid = tid
      AND t.owner_uid = uid
)
INTO perm;
END IF;

RETURN COALESCE(perm, false);
END;
$function$;

NOTIFY pgrst, 'reload schema';
