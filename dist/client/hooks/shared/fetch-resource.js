/** Erro de resposta não-ok da API (status HTTP != 2xx), distinto de falha de rede/conexão. */
export class ResourceFetchError extends Error {
}
/**
 * Fetch genérico contra a rota `/api/resources/[resource]` (backed by `pgrstTable` no server).
 * Compartilhado por `useResourceOptions` (1 resource, 1 combobox) e `useResourceMap` (N resources
 * em paralelo, merge incremental) — não duplicar esta lógica de fetch em outro lugar.
 */
export async function fetchResourceList(resource, filter, defaultErrorMessage = 'Erro ao carregar dados.', options) {
    const query = new URLSearchParams({
        pageSize: String(options?.pageSize ?? 1000),
    });
    const search = options?.search?.trim();
    if (search)
        query.set('search', search);
    if (options?.orderBy)
        query.set('orderBy', options.orderBy);
    if (filter) {
        for (const [field, value] of Object.entries(filter)) {
            query.set(`filter.${field}`, String(value));
        }
    }
    const response = await fetch(`/api/resources/${resource}?${query}`, {
        cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new ResourceFetchError(data.message || defaultErrorMessage);
    }
    return Array.isArray(data.items) ? data.items : [];
}
//# sourceMappingURL=fetch-resource.js.map