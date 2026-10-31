export type FetchResourceRow = {
    id: string | number;
    [key: string]: unknown;
};
/** Erro de resposta não-ok da API (status HTTP != 2xx), distinto de falha de rede/conexão. */
export declare class ResourceFetchError extends Error {
}
export type FetchResourceListOptions = {
    /** Teto de linhas por request. Default 1000 — cubra listas grandes com `search` em vez de subir isto. */
    pageSize?: number;
    /** Busca server-side (`ilike` sobre `config.searchableColumns` do recurso). */
    search?: string;
    /** Coluna de ordenação (default: `config.defaultOrder` do recurso). */
    orderBy?: string;
};
/**
 * Fetch genérico contra a rota `/api/resources/[resource]` (backed by `pgrstTable` no server).
 * Compartilhado por `useResourceOptions` (1 resource, 1 combobox) e `useResourceMap` (N resources
 * em paralelo, merge incremental) — não duplicar esta lógica de fetch em outro lugar.
 */
export declare function fetchResourceList(resource: string, filter?: Record<string, string | number | boolean>, defaultErrorMessage?: string, options?: FetchResourceListOptions): Promise<FetchResourceRow[]>;
//# sourceMappingURL=fetch-resource.d.ts.map