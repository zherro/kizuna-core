import { getSession } from '../../../server';
import { PageHeader } from '../ui-better-soft/headers/page-header';
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

  // "Adicionar saldo": só quem pode gerir marketing (root passa sempre). A conta que recebe o
  // crédito é o tenant desta tela; o lançamento é INSERT direto em `wallet_ledger` (RLS decide).
  const session = await getSession();
  const canCredit = session?.is_root === true || session?.perms?.marketing?.manage === true;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
      <PageHeader
        title="Acessos dos usuários"
        description="Ajuste o papel de cada membro e faça exceções pontuais de permissão. Você só consegue conceder o que já possui; retirar acesso (negar) é sempre permitido."
        backHref="/painel"
      />

      <UserAccessPanel
        users={users}
        roles={roles}
        groups={groupPermissions(permissions)}
        roleGrants={roleGrants}
        initialOverrides={overrides}
        walletTenantId={canCredit ? session?.tenant_id : undefined}
      />
    </div>
  );
}
