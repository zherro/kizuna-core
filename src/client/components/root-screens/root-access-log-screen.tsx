import { ShieldAlert } from 'lucide-react';
import { pgrstTable } from '../../../server';
import { EntityListCard } from '../ui-better-soft/lists/entity-list-card';
import { EmptyStateCard } from '../ui-better-soft/lists/empty-state-card';
import { PageHeader } from '../ui-better-soft/headers/page-header';

type RootAccessLogRow = {
  id: number;
  reason: string;
  entered_at: string;
  root_user: { login: string } | null;
  tenant: { name: string } | null;
};

async function getRootAccessLog(): Promise<RootAccessLogRow[]> {
  const response = await pgrstTable(
    '/root_access_log?select=id,reason,entered_at,root_user:root_user_id(login),tenant:tenant_id(name)&order=entered_at.desc',
    {
      headers: { 'Accept-Profile': 'auth' },
    }
  );
  if (!response.ok) return [];
  return (await response.json()) as RootAccessLogRow[];
}

function formatEnteredAt(value: string) {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });
}

/**
 * Root screen: lists `auth.root_access_log` — one row per time a root account entered a tenant it
 * doesn't own (`auth.fun_auth__root_enter_tenant`, `kizuna-core/sql/0102_fun_auth_has_perm_and_root.sql`).
 * RLS on the table (`kizuna-core/sql/0101_rbac_permissions_and_overrides.sql`) restricts SELECT to
 * `root_user_id = auth.fun_auth_user_id()` — a root account only ever sees its own entries here,
 * never another root's. Generic — reads only core tables — registered under slug
 * `root-access-log`, group `security`, in `root-screens/registry.ts`. The `is_root` gate lives
 * once in `root-screens/resolver.tsx`, not here.
 */
export async function RootAccessLogScreen() {
  const entries = await getRootAccessLog();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
      <PageHeader
        eyebrow="Segurança"
        title="Log de acesso root"
        description="Toda vez que esta conta root entrou num tenant que não é seu, fica registrado aqui — quem, qual tenant e o motivo informado."
      />

      {entries.length === 0 ? (
        <EmptyStateCard
          icon={ShieldAlert}
          title="Nenhum acesso registrado"
          description="Esta conta root ainda não entrou em nenhum tenant que não seja o seu."
        />
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <EntityListCard
              key={entry.id}
              tone="warning"
              leading={
                <div>
                  <span className="text-sm font-semibold">
                    {entry.tenant?.name ?? 'Tenant removido'}
                  </span>
                  <p className="mt-1 text-xs text-muted-foreground">{entry.reason}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Por {entry.root_user?.login ?? 'usuário removido'} em{' '}
                    {formatEnteredAt(entry.entered_at)}
                  </p>
                </div>
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}
