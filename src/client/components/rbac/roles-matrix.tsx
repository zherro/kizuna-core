'use client';

import { Fragment, useMemo, useState } from 'react';
import { Check, Crown, Info, Search, ShieldCheck, Users } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../providers/auth-provider';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { cn } from '../../../lib/utils';
import { callRbacRpc } from './rbac-rpc';
import type { PermissionRow, RoleGrantRow, RoleOverviewRow, RoleRow } from './rbac-data';

type PermissionGroup = { resource: string; items: PermissionRow[] };

type Props = {
  roles: RoleRow[];
  groups: PermissionGroup[];
  initialGrants: RoleGrantRow[];
  overview: RoleOverviewRow[];
};

const key = (roleId: number, permId: number) => `${roleId}:${permId}`;

/** Papel ROOT da tabela `auth.roles`: root de verdade é `users.is_root` e ignora papéis. */
const isRootRole = (role: RoleRow) => (role.code ?? role.name).toUpperCase() === 'ROOT';

const ROLE_LABEL: Record<string, string> = { ADMIN: 'Admin', USER: 'Usuário' };
const roleLabel = (role: RoleRow) =>
  ROLE_LABEL[(role.code ?? role.name).toUpperCase()] ?? role.name;

const ACTION_LABEL: Record<string, string> = {
  view: 'Ver',
  create: 'Criar',
  edit: 'Editar',
  update: 'Editar',
  delete: 'Excluir',
  manage: 'Gerenciar',
  approve: 'Aprovar',
  moderate: 'Moderar',
  configure: 'Configurar',
  grant: 'Conceder',
  publish: 'Publicar',
  export: 'Exportar',
};
const actionLabel = (action: string) => ACTION_LABEL[action] ?? action;

/** `service_moderations` -> "Service moderations" — só legível, não é tradução. */
function humanizeResource(resource: string) {
  if (resource === 'default') return 'Painel (acesso básico)';
  const spaced = resource.replace(/[_-]+/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Nome do catálogo quando é descritivo; o auto-gerado "recurso - ação" não acrescenta nada. */
function permissionHint(perm: PermissionRow) {
  if (!perm.name || perm.name === `${perm.resource} - ${perm.action}`) return null;
  return perm.name;
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Matriz módulo × perfil da tela root "Perfis e permissões". Root é coluna informativa (acesso
 * total); cada papel editável vira uma coluna de checkboxes que grava em `auth.role_grants` via
 * `fn_rbac__set_role_grant`. Os cartões do topo mostram quantos usuários cada perfil tem hoje,
 * por tipo de tenant (`fn_rbac__role_overview`), para a tela refletir a quem a regra se aplica.
 */
export function RolesMatrix({ roles, groups, initialGrants, overview }: Props) {
  const { user } = useAuth();
  const { success, error } = useToast();
  const isRoot = user?.is_root === true;

  const editableRoles = useMemo(() => roles.filter((r) => !isRootRole(r)), [roles]);

  const [grants, setGrants] = useState<Set<string>>(
    () => new Set(initialGrants.map((g) => key(g.role_id, g.permission_id)))
  );
  const [pending, setPending] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState('');

  const rootUsers = overview.find((r) => r.role_id === null)?.users ?? 0;
  const usersByRole = useMemo(() => {
    const map = new Map<number, { total: number; byType: Record<string, number> }>();
    for (const row of overview) {
      if (row.role_id === null) continue;
      const entry = map.get(row.role_id) ?? { total: 0, byType: {} };
      entry.total += row.users;
      entry.byType[row.tenant_type] = (entry.byType[row.tenant_type] ?? 0) + row.users;
      map.set(row.role_id, entry);
    }
    return map;
  }, [overview]);

  const visibleGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.resource.toLowerCase().includes(q) ||
        humanizeResource(g.resource).toLowerCase().includes(q) ||
        g.items.some((p) => (p.name ?? '').toLowerCase().includes(q))
    );
  }, [groups, query]);

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
    success(
      `${roleLabel(role)}: ${next ? 'concedido' : 'removido'} — ${humanizeResource(
        perm.resource
      )} · ${actionLabel(perm.action)}.`
    );
  }

  return (
    <div className="space-y-6">
      {/* Perfis: a quem cada coluna se aplica hoje. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ProfileCard
          icon={Crown}
          title="Root"
          subtitle="Acesso total — não depende das permissões abaixo."
          count={rootUsers}
        />
        {editableRoles.map((role) => {
          const stats = usersByRole.get(role.id) ?? { total: 0, byType: {} };
          const parts = Object.entries(stats.byType)
            .sort((a, b) => b[1] - a[1])
            .map(([type, n]) => `${n} em tenant ${type}`);
          return (
            <ProfileCard
              key={role.id}
              icon={stats.total > 0 ? Users : ShieldCheck}
              title={roleLabel(role)}
              subtitle={
                stats.total === 0 ? 'Nenhum usuário com este perfil hoje.' : parts.join(' · ')
              }
              count={stats.total}
              muted={stats.total === 0}
              badge={role.tenant_id == null ? undefined : 'próprio do tenant'}
            />
          );
        })}
      </div>

      <div className="flex items-start gap-2 rounded-[var(--ui-radius-card-sm,0.5rem)] border-[length:var(--ui-border-w-card,1px)] border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground shadow-[shadow:var(--ui-shadow-item,0_0_#0000)]">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>
          Todo cadastro novo recebe o perfil <strong className="text-foreground">Admin</strong> no
          próprio tenant. Tenants do tipo ADMIN já têm tudo liberado no banco; para eles, as
          marcações abaixo controlam o que aparece no menu e nas telas. As mudanças valem no próximo
          login.
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar módulo..."
          aria-label="Buscar módulo"
          className="pl-9"
        />
      </div>

      <div className="w-full overflow-x-auto rounded-[var(--ui-radius-card-compact,0.75rem)] border-[length:var(--ui-border-w-card,1px)] border-border bg-card shadow-[shadow:var(--ui-shadow-item,0_0_#0000)]">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="sticky left-0 z-20 bg-muted/50 px-4 py-3 text-left font-semibold">
                Módulo / ação
              </th>
              <th className="w-24 px-3 py-3 text-center font-semibold text-muted-foreground">
                Root
              </th>
              {editableRoles.map((role) => (
                <th key={role.id} className="w-28 px-3 py-3 text-center font-semibold">
                  {roleLabel(role)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleGroups.length === 0 ? (
              <tr>
                <td
                  colSpan={editableRoles.length + 2}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  Nenhum módulo encontrado.
                </td>
              </tr>
            ) : (
              visibleGroups.map((group) => (
                <Fragment key={group.resource}>
                  <tr className="border-t border-border bg-muted/25">
                    <td
                      colSpan={editableRoles.length + 2}
                      className="sticky left-0 z-10 px-4 py-2 text-xs font-semibold text-foreground"
                    >
                      {humanizeResource(group.resource)}
                      <span className="ml-2 font-mono text-[10px] font-normal text-muted-foreground">
                        {group.resource}
                      </span>
                    </td>
                  </tr>
                  {group.items.map((perm) => (
                    <tr key={perm.id} className="border-t border-border/60 hover:bg-muted/20">
                      <td className="sticky left-0 z-10 bg-card px-4 py-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-[11px] font-medium">
                            {actionLabel(perm.action)}
                          </Badge>
                          {permissionHint(perm) ? (
                            <span className="text-xs text-muted-foreground">
                              {permissionHint(perm)}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center" title="Root tem acesso total">
                        <Check
                          className="mx-auto h-4 w-4 text-muted-foreground/60"
                          aria-label="Sempre"
                        />
                      </td>
                      {editableRoles.map((role) => {
                        const k = key(role.id, perm.id);
                        const granted = grants.has(k);
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
                              disabled={!isRoot || pending.has(k)}
                              onCheckedChange={() => toggle(role, perm)}
                              aria-label={`${roleLabel(role)} — ${humanizeResource(
                                perm.resource
                              )}: ${actionLabel(perm.action)}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProfileCard({
  icon: Icon,
  title,
  subtitle,
  count,
  muted = false,
  badge,
}: {
  icon: typeof Users;
  title: string;
  subtitle: string;
  count: number;
  muted?: boolean;
  badge?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-[var(--ui-radius-card-compact,0.75rem)] border-[length:var(--ui-border-w-card,1px)] border-border bg-card p-4 shadow-[shadow:var(--ui-shadow-item,0_0_#0000)]',
        muted && 'opacity-70'
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-foreground">{title}</p>
          <Badge variant="secondary" className="text-[10px] font-normal">
            {plural(count, 'usuário', 'usuários')}
          </Badge>
          {badge ? (
            <Badge variant="outline" className="text-[10px] font-normal">
              {badge}
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
