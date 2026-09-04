import { AdminPageReader } from '../ui-better-soft/headers/admin-page-reader';
import {
  getPermissionsCatalog,
  getRoleGrants,
  getRoles,
  getTenantUsers,
  getUserOverrides,
  groupPermissions,
} from './rbac-data';
import { UserAccessPanel } from './user-access-panel';

/**
 * Admin screen: per-user access inside the current tenant — base role (`auth.user_roles`),
 * allow/deny overrides (`auth.user_tenant_permissions`), and "copy access from another user".
 * An admin can only grant (allow) a permission they themselves hold and can only assign a role
 * whose grants are all within that ceiling — enforced by RLS + `auth.fn_auth_can_grant` /
 * `auth.fn_auth_can_assign_role` in `kizuna-core/sql/0111_rbac_admin_delegation.sql`. Reaching
 * this screen requires `tenant_member.view`; every write requires `tenant_member.manage`.
 *
 * Not a ROOT-only screen — the consuming project routes it from its own admin page and does the
 * `tenant_member` permission check there (see foco-total `src/app/painel/administracao/acessos`).
 */
export async function UserAccessManagerScreen() {
  const [users, roles, permissions, overrides, roleGrants] = await Promise.all([
    getTenantUsers(),
    getRoles(),
    getPermissionsCatalog(),
    getUserOverrides(),
    getRoleGrants(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
      <AdminPageReader
        title="Acessos dos usuários"
        description="Ajuste o papel de cada membro e faça exceções pontuais de permissão. Você só consegue conceder o que já possui; retirar acesso (negar) é sempre permitido."
      />

      <UserAccessPanel
        users={users}
        roles={roles}
        groups={groupPermissions(permissions)}
        roleGrants={roleGrants}
        initialOverrides={overrides}
      />
    </div>
  );
}
