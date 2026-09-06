/**
 * ROOT screen (slug `papeis`, group `root` — see `root-screens/registry.ts`). Edits which
 * permissions each role confers (`auth.role_grants`). Root may edit every role including the
 * global templates (ROOT/ADMIN/USER); a tenant admin reaching an equivalent screen could only
 * touch tenant-owned custom roles and only permissions they hold — enforced by RLS in
 * `kizuna-core/sql/0111_rbac_admin_delegation.sql`, mirrored as disabled checkboxes in the UI.
 * The `is_root` gate itself lives in `resolveRootScreen`, not here.
 */
export declare function RolesManagerScreen(): Promise<import("react/jsx-runtime").JSX.Element>;
//# sourceMappingURL=roles-manager.d.ts.map