import type { ComponentType } from 'react';
type ResolveKizunaScreenOptions = {
    /**
     * Componentes para slugs "slot" (entradas com `component: null`) — o componente
     * do projeto consumidor, keyed pela chave da tela (`segments.join('/')`).
     */
    slotComponents?: Record<string, ComponentType<any>>;
};
/**
 * O único lugar onde o gate de permissão de uma tela de painel de plugin vive.
 * Chamado pelo `page.tsx` fino da rota catch-all `/painel/[...kizuna]` com os
 * segmentos da URL. Resolve a chave contra `KIZUNA_SCREEN_REGISTRY`; `notFound()`
 * numa chave desconhecida ou slot sem componente (404 normal do Next, não 500);
 * `redirect('/painel')` se a entrada exige `permResource` e a sessão não tem.
 */
export declare function resolveKizunaScreen(segments: string[], options?: ResolveKizunaScreenOptions): Promise<{
    Component: ComponentType<any> | undefined;
}>;
export {};
//# sourceMappingURL=resolve-kizuna-screen.d.ts.map