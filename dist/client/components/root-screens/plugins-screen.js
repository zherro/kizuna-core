import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Blocks } from 'lucide-react';
import { pgrstTable } from '../../../server';
import { EntityListCard } from '../ui-better-soft/lists/entity-list-card';
import { EmptyStateCard } from '../ui-better-soft/lists/empty-state-card';
import { PageHeader } from '../ui-better-soft/headers/page-header';
async function getInstalledPlugins() {
    const response = await pgrstTable('/plugin_registry?select=name,version,installed_at&order=name', {
        headers: { 'Accept-Profile': 'auth' },
    });
    if (!response.ok)
        return [];
    return (await response.json());
}
function formatInstalledAt(value) {
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
    return (_jsxs("div", { className: "mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 md:px-6", children: [_jsx(PageHeader, { eyebrow: "Root", title: "Plugins instalados", description: "Plugins do kizuna-core (e extras do app) aplicados neste banco \u2014 nome, vers\u00E3o e quando foram instalados." }), plugins.length === 0 ? (_jsx(EmptyStateCard, { icon: Blocks, title: "Nenhum plugin encontrado", description: "auth.plugin_registry est\u00E1 vazia ou o banco ainda n\u00E3o foi instalado via db/install.sh." })) : (_jsx("ul", { className: "space-y-3", children: plugins.map((plugin) => (_jsx(EntityListCard, { leading: _jsxs("div", { children: [_jsx("span", { className: "text-sm font-semibold", children: plugin.name }), _jsxs("p", { className: "mt-1 text-xs text-muted-foreground", children: ["Instalado em ", formatInstalledAt(plugin.installed_at)] })] }), trailing: _jsxs("span", { className: "rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground", children: ["v", plugin.version] }) }, plugin.name))) }))] }));
}
//# sourceMappingURL=plugins-screen.js.map