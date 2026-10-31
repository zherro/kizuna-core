import type { PermissionRow, RoleGrantRow, RoleRow } from './rbac-data';
type PermissionGroup = {
    resource: string;
    items: PermissionRow[];
};
type Props = {
    roles: RoleRow[];
    groups: PermissionGroup[];
    initialGrants: RoleGrantRow[];
};
export declare function RolesMatrix({ roles, groups, initialGrants }: Props): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=roles-matrix.d.ts.map