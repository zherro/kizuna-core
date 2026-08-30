import { Blocks } from 'lucide-react';
import { pgrstTable } from '../../../server';
import { EntityListCard } from '../ui-better-soft/lists/entity-list-card';
import { EmptyStateCard } from '../ui-better-soft/lists/empty-state-card';
import { PageHeader } from '../ui-better-soft/headers/page-header';

type PluginRegistryRow = {
  name: string;
  version: string;
  installed_at: string;
};

async function getInstalledPlugins(): Promise<PluginRegistryRow[]> {
  const response = await pgrstTable(
    '/plugin_registry?select=name,version,installed_at&order=name',
    {
      headers: { 'Accept-Profile': 'auth' },
    }
  );
  if (!response.ok) return [];
  return (await response.json()) as PluginRegistryRow[];
}

function formatInstalledAt(value: string) {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/**
 * Root screen: lists every row of `auth.plugin_registry` (name, version, installed_at). Generic —
 * reads only a core table, no project-specific data — registered under slug `plugins`, group
 * `root`, in `root-screens/registry.ts`. `auth.plugin_registry` has read open to any session (not
 * sensitive data); the `is_root` gate that decides who reaches this screen lives once in
 * `root-screens/resolver.tsx`, not here.
 */
export async function PluginsScreen() {
  const plugins = await getInstalledPlugins();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
      <PageHeader
        eyebrow="Root"
        title="Plugins instalados"
        description="Plugins do kizuna-core (e extras do app) aplicados neste banco — nome, versão e quando foram instalados."
      />

      {plugins.length === 0 ? (
        <EmptyStateCard
          icon={Blocks}
          title="Nenhum plugin encontrado"
          description="auth.plugin_registry está vazia ou o banco ainda não foi instalado via db/install.sh."
        />
      ) : (
        <ul className="space-y-3">
          {plugins.map((plugin) => (
            <EntityListCard
              key={plugin.name}
              leading={
                <div>
                  <span className="text-sm font-semibold">{plugin.name}</span>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Instalado em {formatInstalledAt(plugin.installed_at)}
                  </p>
                </div>
              }
              trailing={
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  v{plugin.version}
                </span>
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}
