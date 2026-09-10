import type { PermissionRow, RoleGrantRow, RoleRow, TenantUserRow, UserOverrideRow } from './rbac-data';
type PermissionGroup = {
    resource: string;
    items: PermissionRow[];
};
type Props = {
    users: TenantUserRow[];
    roles: RoleRow[];
    groups: PermissionGroup[];
    roleGrants: RoleGrantRow[];
    initialOverrides: UserOverrideRow[];
};
export declare function UserAccessPanel({ users, roles, groups, roleGrants, initialOverrides }: Props): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=user-access-panel.d.ts.map