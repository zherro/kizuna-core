import { pgrstRpc, pgrstTable } from '../../../server';

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

export type RoleGrantRow = { role_id: number; permission_id: number };

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

const AUTH_PROFILE = { headers: { 'Accept-Profile': 'auth' } } as const;

export async function getPermissionsCatalog(): Promise<PermissionRow[]> {
  const res = await pgrstTable(
    '/permissions?select=id,resource,action,name&order=resource.asc,action.asc',
    AUTH_PROFILE
  );
  if (!res.ok) return [];
  return (await res.json()) as PermissionRow[];
}

export async function getRoles(): Promise<RoleRow[]> {
  const res = await pgrstTable(
    '/roles?select=id,name,code,tenant_id&active=eq.true&order=id.asc',
    AUTH_PROFILE
  );
  if (!res.ok) return [];
  return (await res.json()) as RoleRow[];
}

export async function getRoleGrants(): Promise<RoleGrantRow[]> {
  const res = await pgrstTable('/role_grants?select=role_id,permission_id', AUTH_PROFILE);
  if (!res.ok) return [];
  return (await res.json()) as RoleGrantRow[];
}

export async function getTenantUsers(): Promise<TenantUserRow[]> {
  const res = await pgrstRpc('fn_rbac__tenant_users', {}, { schema: 'auth' });
  if (!res.ok) return [];
  return (await res.json()) as TenantUserRow[];
}

export async function getUserOverrides(): Promise<UserOverrideRow[]> {
  const res = await pgrstTable(
    '/user_tenant_permissions?select=user_id,permission_id,effect',
    AUTH_PROFILE
  );
  if (!res.ok) return [];
  return (await res.json()) as UserOverrideRow[];
}

/** Groups a flat permission list by `resource`, preserving catalog order. */
export function groupPermissions(permissions: PermissionRow[]): Array<{
  resource: string;
  items: PermissionRow[];
}> {
  const order: string[] = [];
  const map = new Map<string, PermissionRow[]>();
  for (const perm of permissions) {
    if (!map.has(perm.resource)) {
      map.set(perm.resource, []);
      order.push(perm.resource);
    }
    map.get(perm.resource)!.push(perm);
  }
  return order.map((resource) => ({ resource, items: map.get(resource)! }));
}
