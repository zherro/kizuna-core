'use client';

import { useMemo, useState } from 'react';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../providers/auth-provider';
import { callRbacRpc } from './rbac-rpc';
import type {
  PermissionRow,
  RoleGrantRow,
  RoleRow,
  TenantUserRow,
  UserOverrideRow,
} from './rbac-data';

type PermissionGroup = { resource: string; items: PermissionRow[] };
type OverrideState = 'inherit' | 'allow' | 'deny';

type Props = {
  users: TenantUserRow[];
  roles: RoleRow[];
  groups: PermissionGroup[];
  roleGrants: RoleGrantRow[];
  initialOverrides: UserOverrideRow[];
};

export function UserAccessPanel({
  users,
  roles,
  groups,
  roleGrants,
  initialOverrides,
}: Props) {
  const { user: me } = useAuth();
  const { success, error } = useToast();
  const isRoot = me?.is_root === true;

  const [selectedId, setSelectedId] = useState<string | null>(users[0]?.user_id ?? null);
  const [userRole, setUserRole] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(users.map((u) => [u.user_id, u.role_id]))
  );
  const [overrides, setOverrides] = useState<Record<string, OverrideState>>(() => {
    const map: Record<string, OverrideState> = {};
    for (const o of initialOverrides) map[`${o.user_id}:${o.permission_id}`] = o.effect;
    return map;
  });
  const [busy, setBusy] = useState(false);

  const selected = users.find((u) => u.user_id === selectedId) ?? null;

  const roleGrantIds = useMemo(() => {
    const map = new Map<number, Set<number>>();
    for (const g of roleGrants) {
      if (!map.has(g.role_id)) map.set(g.role_id, new Set());
      map.get(g.role_id)!.add(g.permission_id);
    }
    return map;
  }, [roleGrants]);

  const callerCanGrant = (perm: PermissionRow) =>
    isRoot ||
    (me?.perms?.[perm.resource] as Record<string, boolean> | undefined)?.[perm.action] === true;

  async function changeRole(nextRoleId: number) {
    if (!selected) return;
    setBusy(true);
    const res = await callRbacRpc('fn_rbac__set_user_role', {
      p_user_id: selected.user_id,
      p_role_id: nextRoleId,
    });
    setBusy(false);
    if (!res.ok) {
      error(res.message ?? 'Não foi possível alterar o papel.');
      return;
    }
    setUserRole((prev) => ({ ...prev, [selected.user_id]: nextRoleId }));
    success('Papel atualizado.');
  }

  async function changeOverride(perm: PermissionRow, next: OverrideState) {
    if (!selected) return;
    const k = `${selected.user_id}:${perm.id}`;
    const prev = overrides[k] ?? 'inherit';
    setOverrides((o) => ({ ...o, [k]: next }));
    setBusy(true);
    const res = await callRbacRpc('fn_rbac__set_user_override', {
      p_user_id: selected.user_id,
      p_permission_id: perm.id,
      p_effect: next === 'inherit' ? null : next,
    });
    setBusy(false);
    if (!res.ok) {
      setOverrides((o) => ({ ...o, [k]: prev }));
      error(res.message ?? 'Não foi possível salvar o ajuste.');
      return;
    }
    success('Acesso atualizado.');
  }

  async function copyFrom(sourceUserId: string) {
    if (!selected || !sourceUserId) return;
    setBusy(true);
    const res = await callRbacRpc('fn_rbac__copy_user_access', {
      p_source_user: sourceUserId,
      p_target_user: selected.user_id,
    });
    setBusy(false);
    if (!res.ok) {
      error(res.message ?? 'Não foi possível copiar o acesso.');
      return;
    }
    success('Acesso copiado. Recarregando…');
    if (typeof window !== 'undefined') window.location.reload();
  }

  if (users.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
        Nenhum membro neste tenant.
      </p>
    );
  }

  const currentRoleId = selected ? userRole[selected.user_id] ?? null : null;
  const inheritedIds = currentRoleId ? roleGrantIds.get(currentRoleId) ?? new Set<number>() : new Set<number>();

  return (
    <div className="grid gap-6 md:grid-cols-[260px_1fr]">
      <aside className="rounded-xl border border-border">
        <ul className="max-h-[70vh] divide-y divide-border overflow-y-auto">
          {users.map((u) => {
            const label = u.display_name || u.full_name || u.email || u.user_id.slice(0, 8);
            const active = u.user_id === selectedId;
            return (
              <li key={u.user_id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(u.user_id)}
                  className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition ${
                    active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                  }`}
                >
                  <span className="font-medium">
                    {label}
                    {u.is_root ? ' · root' : ''}
                  </span>
                  {u.email ? (
                    <span
                      className={`text-xs ${active ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}
                    >
                      {u.email}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {selected ? (
        <section className="flex flex-col gap-6">
          <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border p-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Papel base</span>
              <select
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                value={currentRoleId ?? ''}
                disabled={busy || selected.is_root}
                onChange={(e) => void changeRole(Number(e.target.value))}
              >
                {currentRoleId == null ? <option value="">—</option> : null}
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Copiar acesso de…</span>
              <select
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                defaultValue=""
                disabled={busy}
                onChange={(e) => {
                  void copyFrom(e.target.value);
                  e.target.value = '';
                }}
              >
                <option value="">Selecionar usuário</option>
                {users
                  .filter((u) => u.user_id !== selected.user_id)
                  .map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.display_name || u.full_name || u.email || u.user_id.slice(0, 8)}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          <div className="space-y-5">
            {groups.map((group) => (
              <div key={group.resource} className="rounded-xl border border-border">
                <p className="border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.resource}
                </p>
                <ul className="divide-y divide-border/60">
                  {group.items.map((perm) => {
                    const k = `${selected.user_id}:${perm.id}`;
                    const state: OverrideState = overrides[k] ?? 'inherit';
                    const inherited = inheritedIds.has(perm.id);
                    const canAllow = callerCanGrant(perm);
                    return (
                      <li
                        key={perm.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm"
                      >
                        <span>
                          <span className="font-medium">{perm.action}</span>
                          {perm.name ? (
                            <span className="ml-2 text-xs text-muted-foreground">{perm.name}</span>
                          ) : null}
                          <span className="ml-2 text-[11px] text-muted-foreground">
                            (papel: {inherited ? 'concede' : 'não concede'})
                          </span>
                        </span>
                        <span className="flex gap-1">
                          {(['inherit', 'allow', 'deny'] as OverrideState[]).map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              disabled={busy || (opt === 'allow' && !canAllow)}
                              onClick={() => void changeOverride(perm, opt)}
                              className={`rounded-md border px-2 py-1 text-xs transition disabled:opacity-40 ${
                                state === opt
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-border hover:bg-accent'
                              }`}
                            >
                              {opt === 'inherit' ? 'Herdar' : opt === 'allow' ? 'Permitir' : 'Negar'}
                            </button>
                          ))}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
