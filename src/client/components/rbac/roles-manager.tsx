import { PageHeader } from '../ui-better-soft/headers/page-header';
import {
  getPermissionsCatalog,
  getRoleGrants,
  getRoleOverview,
  getRoles,
  groupPermissions,
} from './rbac-data';
import { RolesMatrix } from './roles-matrix';

/**
 * ROOT screen (slug `papeis`, group `root` — see `root-screens/registry.ts`). Edits which
 * permissions each profile confers (`auth.role_grants` — fonte única por perfil desde a migration
 * 0118, que consolidou o `role_permissions` legado). Mostra a quem cada perfil se aplica de verdade
 * (`fn_rbac__role_overview`): hoje todo cadastro nasce com o papel ADMIN no próprio tenant USER.
 * Root não usa papéis (acesso total) e aparece só como coluna informativa. As mudanças valem no
 * próximo login de cada usuário (as permissões vão no token da sessão).
 * The `is_root` gate itself lives in `resolveRootScreen`, not here.
 */
export async function RolesManagerScreen() {
  const [permissions, roles, grants, overview] = await Promise.all([
    getPermissionsCatalog(),
    getRoles(),
    getRoleGrants(),
    getRoleOverview(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-4 py-8 md:px-6">
      <PageHeader
        title="Perfis e permissões"
        description="O que cada perfil pode acessar. Marcar ou desmarcar vale para todos os usuários do perfil a partir do próximo login."
        backHref="/painel"
        backLabel="Painel"
      />

      {roles.length === 0 || permissions.length === 0 ? (
        <p className="rounded-[var(--ui-radius-card-compact,0.75rem)] border-[length:var(--ui-border-w-card,1px)] border-border shadow-[shadow:var(--ui-shadow-item,0_0_#0000)] bg-muted/30 p-6 text-sm text-muted-foreground">
          Nenhum perfil ou permissão encontrado. Verifique se as migrations de auth e os plugins
          foram aplicados.
        </p>
      ) : (
        <RolesMatrix
          roles={roles}
          groups={groupPermissions(permissions)}
          initialGrants={grants}
          overview={overview}
        />
      )}
    </div>
  );
}
