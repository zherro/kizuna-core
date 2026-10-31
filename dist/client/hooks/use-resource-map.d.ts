export type ResourceMapEntry = {
    /** Key em `postgrestResources` — nome do resource, nunca hardcoded pelo hook. */
    resource: string;
    filter?: Record<string, string | number | boolean>;
    /** Cada item copia o campo `from` do registro cru pro campo `to` do resultado mesclado. */
    map: Array<{
        from: string;
        to: string;
    }>;
};
export type UseResourceMapResult = {
    /** Populado incrementalmente — cada entry escreve seu(s) campo(s) assim que responde, não
     * espera as outras entries. Um bloco pode ler `data.categorias` já preenchido enquanto
     * `data.grupos` ainda está undefined. */
    data: Record<string, unknown>;
    /** true enquanto QUALQUER entry ainda está em voo — use `pendingResources` se precisar saber
     * qual campo especificamente ainda não chegou, em vez de esconder a tela inteira. */
    loading: boolean;
    pendingResources: string[];
    errors: Record<string, string>;
};
/**
 * Orquestra N fetches de resource em paralelo (cada um via `fetchResourceList`, mesmo padrão de
 * `useResourceOptions`) e mescla o resultado no shape que um bloco bespoke consome — sem grafo de
 * dependência: pra um combobox filtrado pelo valor de outro, use `useResourceOptions` reagindo a
 * um `filter` que muda.
 *
 * Renderização progressiva, nunca "esperar todo mundo": cada entry resolve e escreve sua fatia de
 * `data` assim que responde — nunca um único `Promise.all(...).then(setData)` monolítico que só
 * libera quando a entry mais lenta termina.
 */
export declare function useResourceMap(entries: ResourceMapEntry[]): UseResourceMapResult;
//# sourceMappingURL=use-resource-map.d.ts.map