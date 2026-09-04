import { AdminPageReader } from '../ui-better-soft/headers/admin-page-reader';
import {
  getPermissionsCatalog,
  getRoleGrants,
  getRoles,
  groupPermissions,
} from './rbac-data';
import { RolesMatrix } from './roles-matrix';

/**
 * ROOT screen (slug `papeis`, group `root` — see `root-screens/registry.ts`). Edits which
 * permissions each role confers (`auth.role_grants`). Root may edit every role including the
 * global templates (ROOT/ADMIN/USER); a tenant admin reaching an equivalent screen could only
 * touch tenant-owned custom roles and only permissions they hold — enforced by RLS in
 * `kizuna-core/sql/0111_rbac_admin_delegation.sql`, mirrored as disabled checkboxes in the UI.
 * The `is_root` gate itself lives in `resolveRootScreen`, not here.
 */
export async function RolesManagerScreen() {
  const [permissions, roles, grants] = await Promise.all([
    getPermissionsCatalog(),
    getRoles(),
    getRoleGrants(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
      <AdminPageReader
        title="Papéis e permissões"
        description="Defina o que cada papel concede. As permissões vêm do catálogo declarado pelos plugins instalados; marcar aqui é o que efetivamente libera o recurso para quem tem o papel."
      />

      {roles.length === 0 || permissions.length === 0 ? (
        <p className="rounded-xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
          Nenhum papel ou permissão encontrado. Verifique se as migrations de auth e os plugins
          foram aplicados.
        </p>
      ) : (
        <RolesMatrix
          roles={roles}
          groups={groupPermissions(permissions)}
          initialGrants={grants}
        />
      )}
    </div>
  );
}
