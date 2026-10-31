/**
 * Server-side readers for the RBAC admin screens (RolesManager / UserAccessManager).
 * Everything lives in the `auth` schema, so table reads pass `Accept-Profile: auth`.
 * The real authorization boundary is RLS + the policies/functions in
 * `kizuna-core/sql/0111_rbac_admin_delegation.sql` — these reads just feed the UI.
 */
export type PermissionRow = {
    id: number;
    resource: string;
    action: string;
    name: string | null;
};
export type RoleRow = {
    id: number;
    name: string;
    code: string | null;
    tenant_id: string | null;
};
export type RoleGrantRow = {
    role_id: number;
    permission_id: number;
};
export type TenantUserRow = {
    user_id: string;
    display_name: string | null;
    full_name: string | null;
    email: string | null;
    role_id: number | null;
    is_root: boolean;
};
export type UserOverrideRow = {
    user_id: string;
    permission_id: number;
    effect: 'allow' | 'deny';
};
export declare function getPermissionsCatalog(): Promise<PermissionRow[]>;
export declare function getRoles(): Promise<RoleRow[]>;
export declare function getRoleGrants(): Promise<RoleGrantRow[]>;
export declare function getTenantUsers(): Promise<TenantUserRow[]>;
export declare function getUserOverrides(): Promise<UserOverrideRow[]>;
/** Groups a flat permission list by `resource`, preserving catalog order. */
export declare function groupPermissions(permissions: PermissionRow[]): Array<{
    resource: string;
    items: PermissionRow[];
}>;
//# sourceMappingURL=rbac-data.d.ts.map