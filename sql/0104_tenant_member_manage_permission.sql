-- 0104_tenant_member_manage_permission.sql
-- Closes the escalation gap found in 0101's role_grants_write_policy/utp_write_policy: those only
-- checked tenant_id = current_tenant (isolation), never whether the caller is actually authorized
-- to manage members/permissions within that tenant. A plain USER (born with zero permissions,
-- spec section 3) could otherwise INSERT a row into user_tenant_permissions granting themselves
-- anything, as long as they were logged into that tenant.

INSERT INTO auth.permissions (resource, action, name)
VALUES ('tenant_member', 'manage', 'Gerenciar membros e permissões do tenant')
ON CONFLICT (resource, action) DO NOTHING;

-- ADMIN (role_id=2, global template role, tenant owner by default) gets it out of the box.
INSERT INTO auth.role_grants (role_id, permission_id)
SELECT 2, id FROM auth.permissions WHERE resource = 'tenant_member' AND action = 'manage'
ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS role_grants_write_policy ON auth.role_grants;
CREATE POLICY role_grants_write_policy ON auth.role_grants FOR ALL TO auth_user
USING (
  EXISTS (
    SELECT 1 FROM auth.roles r
    WHERE r.id = role_grants.role_id
      AND r.tenant_id IS NOT NULL
      AND r.tenant_id = auth.fun_auth_current_tenant_id()
  )
  AND auth.fun_auth_has_perm('tenant_member', 'manage')
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.roles r
    WHERE r.id = role_grants.role_id
      AND r.tenant_id IS NOT NULL
      AND r.tenant_id = auth.fun_auth_current_tenant_id()
  )
  AND auth.fun_auth_has_perm('tenant_member', 'manage')
);

DROP POLICY IF EXISTS utp_write_policy ON auth.user_tenant_permissions;
CREATE POLICY utp_write_policy ON auth.user_tenant_permissions FOR ALL TO auth_user
USING (
  tenant_id = auth.fun_auth_current_tenant_id()
  AND auth.fun_auth_has_perm('tenant_member', 'manage')
)
WITH CHECK (
  tenant_id = auth.fun_auth_current_tenant_id()
  AND auth.fun_auth_has_perm('tenant_member', 'manage')
);

NOTIFY pgrst, 'reload schema';
