import type { ComponentType } from 'react';
/**
 * Uma tela do painel resolvida pela rota catch-all `/painel/[...kizuna]`.
 * A chave é o path relativo a `/painel` com os segmentos unidos por `/`
 * (ex.: `agenda`, `taxonomia/categorias`).
 */
export type KizunaScreenEntry = {
    title: string;
    component: ComponentType<any> | null;
    /** Se setado, exige `session.perms[permResource].view` (ou is_root). */
    permResource?: string;
    /** Se true, exige tenant ADMIN ou is_root (padrão das telas de catálogo). */
    adminOnly?: boolean;
};
/**
 * Telas de painel que o kizuna-core já entrega. A rota `/painel/[...kizuna]` do
 * template resolve qualquer chave aqui. Cada tela ainda é gateada por RLS no
 * banco; `permResource`/`adminOnly` só controlam o acesso à rota.
 *
 * As tabelas/RPCs que essas telas usam vêm das migrations dos plugins
 * (`node kizuna-core/cli db install`). Sem elas a tela abre mas as chamadas
 * de API falham.
 */
export declare const KIZUNA_SCREEN_REGISTRY: Record<string, KizunaScreenEntry>;
//# sourceMappingURL=kizuna-screen-registry.d.ts.map