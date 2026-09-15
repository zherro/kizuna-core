'use client';

import { useMemo, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../providers/auth-provider';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { cn } from '../../../lib/utils';
import { callRbacRpc } from './rbac-rpc';
import type { PermissionRow, RoleGrantRow, RoleRow } from './rbac-data';

type PermissionGroup = { resource: string; items: PermissionRow[] };

type Props = {
  roles: RoleRow[];
  groups: PermissionGroup[];
  initialGrants: RoleGrantRow[];
};

const key = (roleId: number, permId: number) => `${roleId}:${permId}`;

/** `service_moderations` -> "Service moderations" — just readable, not a translation. */
function humanizeResource(resource: string) {
  const spaced = resource.replace(/[_-]+/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function RolesMatrix({ roles, groups, initialGrants }: Props) {
  const { user } = useAuth();
  const { success, error } = useToast();
  const isRoot = user?.is_root === true;

  const [grants, setGrants] = useState<Set<string>>(
    () => new Set(initialGrants.map((g) => key(g.role_id, g.permission_id)))
  );
  const [pending, setPending] = useState<Set<string>>(() => new Set());

  const canEditRole = useMemo(() => (role: RoleRow) => isRoot || role.tenant_id != null, [isRoot]);

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
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> concedida
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-muted" /> não concedida
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-muted opacity-40" /> sem permissão pra conceder
      </span>

      <div className="mt-2 w-full overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/60">
              <th className="sticky left-0 z-20 bg-muted/60 px-4 py-3 text-left font-semibold">
                Permissão
              </th>
              {roles.map((role) => (
                <th
                  key={role.id}
                  className="min-w-[104px] px-3 py-3 text-center font-semibold whitespace-nowrap"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span>{role.name}</span>
                    <Badge
                      variant={role.tenant_id == null ? 'secondary' : 'outline'}
                      className="text-[10px] font-normal"
                    >
                      {role.tenant_id == null ? 'global' : 'próprio'}
                    </Badge>
                  </div>
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
      <tr className="border-t border-border bg-muted/30">
        <td
          colSpan={roles.length + 1}
          className="sticky left-0 z-10 bg-muted/30 px-4 py-2 text-xs font-semibold tracking-wide text-foreground/80"
        >
          <span className="inline-flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            {humanizeResource(group.resource)}
            <Badge variant="outline" className="ml-1 text-[10px] font-normal text-muted-foreground">
              {group.items.length}
            </Badge>
          </span>
        </td>
      </tr>
      {group.items.map((perm, idx) => (
        <tr
          key={perm.id}
          className={cn(
            'border-t border-border/60 hover:bg-muted/20',
            idx % 2 === 1 && 'bg-muted/10'
          )}
        >
          <td className="sticky left-0 z-10 bg-background px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px] uppercase">
                {perm.action}
              </Badge>
              {perm.name ? (
                <span className="text-xs text-muted-foreground">{perm.name}</span>
              ) : null}
            </div>
          </td>
          {roles.map((role) => {
            const k = key(role.id, perm.id);
            const granted = grants.has(k);
            const disabled = pending.has(k) || !canEditRole(role) || !callerCanGrant(perm);
            return (
              <td
                key={role.id}
                className={cn(
                  'px-3 py-2.5 text-center transition-colors',
                  granted && 'bg-primary/5'
                )}
              >
                <Checkbox
                  className={cn(pending.has(k) && 'animate-pulse')}
                  checked={granted}
                  disabled={disabled}
                  onCheckedChange={() => onToggle(role, perm)}
                  aria-label={`${role.name} — ${group.resource}.${perm.action}`}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
