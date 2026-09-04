'use client';

import { useMemo, useState } from 'react';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../providers/auth-provider';
import { callRbacRpc } from './rbac-rpc';
import type { PermissionRow, RoleGrantRow, RoleRow } from './rbac-data';

type PermissionGroup = { resource: string; items: PermissionRow[] };

type Props = {
  roles: RoleRow[];
  groups: PermissionGroup[];
  initialGrants: RoleGrantRow[];
};

const key = (roleId: number, permId: number) => `${roleId}:${permId}`;

export function RolesMatrix({ roles, groups, initialGrants }: Props) {
  const { user } = useAuth();
  const { success, error } = useToast();
  const isRoot = user?.is_root === true;

  const [grants, setGrants] = useState<Set<string>>(
    () => new Set(initialGrants.map((g) => key(g.role_id, g.permission_id)))
  );
  const [pending, setPending] = useState<Set<string>>(() => new Set());

  const canEditRole = useMemo(
    () => (role: RoleRow) => isRoot || role.tenant_id != null,
    [isRoot]
  );

  const callerCanGrant = (perm: PermissionRow) =>
    isRoot ||
    (user?.perms?.[perm.resource] as Record<string, boolean> | undefined)?.[perm.action] === true;

  async function toggle(role: RoleRow, perm: PermissionRow) {
    const k = key(role.id, perm.id);
    const next = !grants.has(k);

    setPending((p) => new Set(p).add(k));
    setGrants((prev) => {
      const s = new Set(prev);
      if (next) s.add(k);
      else s.delete(k);
      return s;
    });

    const res = await callRbacRpc('fn_rbac__set_role_grant', {
      p_role_id: role.id,
      p_permission_id: perm.id,
      p_granted: next,
    });

    setPending((p) => {
      const s = new Set(p);
      s.delete(k);
      return s;
    });

    if (!res.ok) {
      setGrants((prev) => {
        const s = new Set(prev);
        if (next) s.delete(k);
        else s.add(k);
        return s;
      });
      error(res.message ?? 'Não foi possível salvar.');
      return;
    }
    success('Permissão atualizada.');
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-muted/50">
            <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left font-semibold">
              Permissão
            </th>
            {roles.map((role) => (
              <th key={role.id} className="px-3 py-2 text-center font-semibold whitespace-nowrap">
                {role.name}
                {role.tenant_id == null ? (
                  <span className="ml-1 text-[10px] font-normal text-muted-foreground">global</span>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <FragmentGroup
              key={group.resource}
              group={group}
              roles={roles}
              grants={grants}
              pending={pending}
              canEditRole={canEditRole}
              callerCanGrant={callerCanGrant}
              onToggle={toggle}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FragmentGroup({
  group,
  roles,
  grants,
  pending,
  canEditRole,
  callerCanGrant,
  onToggle,
}: {
  group: PermissionGroup;
  roles: RoleRow[];
  grants: Set<string>;
  pending: Set<string>;
  canEditRole: (role: RoleRow) => boolean;
  callerCanGrant: (perm: PermissionRow) => boolean;
  onToggle: (role: RoleRow, perm: PermissionRow) => void;
}) {
  return (
    <>
      <tr className="border-t border-border bg-background">
        <td
          colSpan={roles.length + 1}
          className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {group.resource}
        </td>
      </tr>
      {group.items.map((perm) => (
        <tr key={perm.id} className="border-t border-border/60">
          <td className="sticky left-0 z-10 bg-background px-3 py-2">
            <span className="font-medium">{perm.action}</span>
            {perm.name ? (
              <span className="ml-2 text-xs text-muted-foreground">{perm.name}</span>
            ) : null}
          </td>
          {roles.map((role) => {
            const k = key(role.id, perm.id);
            const disabled =
              pending.has(k) || !canEditRole(role) || !callerCanGrant(perm);
            return (
              <td key={role.id} className="px-3 py-2 text-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary disabled:opacity-40"
                  checked={grants.has(k)}
                  disabled={disabled}
                  onChange={() => onToggle(role, perm)}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
