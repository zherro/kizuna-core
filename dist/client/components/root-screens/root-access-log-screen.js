import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ShieldAlert } from 'lucide-react';
import { pgrstTable } from '../../../server';
import { EntityListCard } from '../ui-better-soft/lists/entity-list-card';
import { EmptyStateCard } from '../ui-better-soft/lists/empty-state-card';
import { PageHeader } from '../ui-better-soft/headers/page-header';
async function getRootAccessLog() {
    const response = await pgrstTable('/root_access_log?select=id,reason,entered_at,root_user:root_user_id(login),tenant:tenant_id(name)&order=entered_at.desc', {
        headers: { 'Accept-Profile': 'auth' },
    });
    if (!response.ok)
        return [];
    return (await response.json());
}
function formatEnteredAt(value) {
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
    return (_jsxs("div", { className: "mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 md:px-6", children: [_jsx(PageHeader, { eyebrow: "Seguran\u00E7a", title: "Log de acesso root", description: "Toda vez que esta conta root entrou num tenant que n\u00E3o \u00E9 seu, fica registrado aqui \u2014 quem, qual tenant e o motivo informado." }), entries.length === 0 ? (_jsx(EmptyStateCard, { icon: ShieldAlert, title: "Nenhum acesso registrado", description: "Esta conta root ainda n\u00E3o entrou em nenhum tenant que n\u00E3o seja o seu." })) : (_jsx("ul", { className: "space-y-3", children: entries.map((entry) => (_jsx(EntityListCard, { tone: "warning", leading: _jsxs("div", { children: [_jsx("span", { className: "text-sm font-semibold", children: entry.tenant?.name ?? 'Tenant removido' }), _jsx("p", { className: "mt-1 text-xs text-muted-foreground", children: entry.reason }), _jsxs("p", { className: "mt-1 text-xs text-muted-foreground", children: ["Por ", entry.root_user?.login ?? 'usuário removido', " em", ' ', formatEnteredAt(entry.entered_at)] })] }) }, entry.id))) }))] }));
}
//# sourceMappingURL=root-access-log-screen.js.map