import { pgrstRpc, pgrstTable } from '../../../server';
const AUTH_PROFILE = { headers: { 'Accept-Profile': 'auth' } };
export async function getPermissionsCatalog() {
    const res = await pgrstTable('/permissions?select=id,resource,action,name&order=resource.asc,action.asc', AUTH_PROFILE);
    if (!res.ok)
        return [];
    return (await res.json());
}
export async function getRoles() {
    const res = await pgrstTable('/roles?select=id,name,code,tenant_id&active=eq.true&order=id.asc', AUTH_PROFILE);
    if (!res.ok)
        return [];
    return (await res.json());
}
export async function getRoleGrants() {
    const res = await pgrstTable('/role_grants?select=role_id,permission_id', AUTH_PROFILE);
    if (!res.ok)
        return [];
    return (await res.json());
}
export async function getTenantUsers() {
    const res = await pgrstRpc('fn_rbac__tenant_users', {}, { schema: 'auth' });
    if (!res.ok)
        return [];
    return (await res.json());
}
export async function getUserOverrides() {
    const res = await pgrstTable('/user_tenant_permissions?select=user_id,permission_id,effect', AUTH_PROFILE);
    if (!res.ok)
        return [];
    return (await res.json());
}
/** Groups a flat permission list by `resource`, preserving catalog order. */
export function groupPermissions(permissions) {
    const order = [];
    const map = new Map();
    for (const perm of permissions) {
        if (!map.has(perm.resource)) {
            map.set(perm.resource, []);
            order.push(perm.resource);
        }
        map.get(perm.resource).push(perm);
    }
    return order.map((resource) => ({ resource, items: map.get(resource) }));
}
//# sourceMappingURL=rbac-data.js.map