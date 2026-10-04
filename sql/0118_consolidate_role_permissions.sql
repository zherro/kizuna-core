-- 0118_consolidate_role_permissions.sql
-- Tela "Papéis e permissões" (/painel/root/papeis) como fonte única da verdade por perfil.
--
-- 1) Consolida auth.role_permissions (formato legado, jsonb por papel) em auth.role_grants. As duas
--    eram lidas pelo login (get_auth__effective_permissions) e somadas, mas a tela só mostra/edita
--    role_grants: o que vinha do legado aparecia desmarcado e não dava para tirar. Copia todo
--    `true` para role_grants e esvazia role_permissions — o acesso efetivo de ninguém muda
--    (um `false` legado só "negava" o que nenhuma outra fonte concedia; ausente dá o mesmo resultado).
--    Fica de fora, de propósito, o que não é "por perfil": tenant_role_permissions (por tenant),
--    group_permissions (por grupo) e user_tenant_permissions (por usuário).
--
-- 2) auth.fn_rbac__role_overview(): quantos usuários cada papel tem, por tipo de tenant, e quantos
--    são root — para a tela mostrar a quem cada coluna se aplica de verdade. Só root.

INSERT INTO auth.permissions (resource, action, name)
SELECT DISTINCT rp.resource, kv.key, rp.resource || ' - ' || kv.key
FROM auth.role_permissions rp
CROSS JOIN LATERAL jsonb_each(rp.permissions) AS kv(key, value)
WHERE kv.value IN ('true'::jsonb, '"true"'::jsonb)
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO auth.role_grants (role_id, permission_id)
SELECT DISTINCT rp.role_id, p.id
FROM auth.role_permissions rp
CROSS JOIN LATERAL jsonb_each(rp.permissions) AS kv(key, value)
JOIN auth.permissions p ON p.resource = rp.resource AND p.action = kv.key
WHERE kv.value IN ('true'::jsonb, '"true"'::jsonb)
ON CONFLICT DO NOTHING;

DELETE FROM auth.role_permissions;

CREATE OR REPLACE FUNCTION auth.fn_rbac__role_overview()
RETURNS TABLE (
  role_id     bigint,
  tenant_type text,
  users       bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  IF NOT COALESCE((current_setting('request.jwt.claims', true)::jsonb ->> 'is_root')::boolean, false) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT ur.role_id::bigint, COALESCE(t.type, '?')::text, count(DISTINCT ur.user_id)::bigint
  FROM auth.user_roles ur
  LEFT JOIN auth.tenants t ON t.uid = ur.tenant_id
  GROUP BY ur.role_id, t.type

  UNION ALL

  -- role_id NULL = linha dos root (is_root ignora papéis: tem acesso total).
  SELECT NULL::bigint, 'ROOT'::text, count(*)::bigint
  FROM auth.users u
  WHERE u.is_root = true;
END;
$$;

REVOKE ALL ON FUNCTION auth.fn_rbac__role_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth.fn_rbac__role_overview() TO auth_user;

NOTIFY pgrst, 'reload schema';
