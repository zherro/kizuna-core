export type FetchResourceRow = { id: string | number; [key: string]: unknown };

/** Erro de resposta não-ok da API (status HTTP != 2xx), distinto de falha de rede/conexão. */
export class ResourceFetchError extends Error {}

export type FetchResourceListOptions = {
  /** Teto de linhas por request. Default 1000 — cubra listas grandes com `search` em vez de subir isto. */
  pageSize?: number;
  /** Busca server-side (`ilike` sobre `config.searchableColumns` do recurso). */
  search?: string;
  /** Coluna de ordenação (default: `config.defaultOrder` do recurso). */
  orderBy?: string;
  /**
   * Reaproveita a mesma requisição (mesma URL) por `ttlMs` (default 60 s) — para taxonomia pública
   * lida por vários hooks na mesma página. Default OFF. Falha não fica em cache.
   */
  dedupe?: boolean | { ttlMs?: number };
};

const DEDUPE_TTL_MS = 60_000;
const dedupeCache = new Map<string, { p: Promise<FetchResourceRow[]>; at: number }>();

/** Limpa o cache de dedupe (testes). */
export function __resetFetchResourceCache() {
  dedupeCache.clear();
}

/**
 * Fetch genérico contra a rota `/api/resources/[resource]` (backed by `pgrstTable` no server).
 * Compartilhado por `useResourceOptions` (1 resource, 1 combobox) e `useResourceMap` (N resources
 * em paralelo, merge incremental) — não duplicar esta lógica de fetch em outro lugar.
 */
export async function fetchResourceList(
  resource: string,
  filter?: Record<string, string | number | boolean>,
  defaultErrorMessage = 'Erro ao carregar dados.',
  options?: FetchResourceListOptions
): Promise<FetchResourceRow[]> {
  const query = new URLSearchParams({
    pageSize: String(options?.pageSize ?? 1000),
  });

  const search = options?.search?.trim();
  if (search) query.set('search', search);
  if (options?.orderBy) query.set('orderBy', options.orderBy);

  if (filter) {
    for (const [field, value] of Object.entries(filter)) {
      query.set(`filter.${field}`, String(value));
    }
  }

  const url = `/api/resources/${resource}?${query}`;

  async function load(): Promise<FetchResourceRow[]> {
    const response = await fetch(url, {
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new ResourceFetchError(data.message || defaultErrorMessage);
    }

    return Array.isArray(data.items) ? data.items : [];
  }

  if (!options?.dedupe) return load();

  const ttl = (typeof options.dedupe === 'object' ? options.dedupe.ttlMs : undefined) ?? DEDUPE_TTL_MS;
  const hit = dedupeCache.get(url);
  if (hit && Date.now() - hit.at < ttl) return hit.p;

  const p = load();
  const entry = { p, at: Date.now() };
  dedupeCache.set(url, entry);
  p.catch(() => {
    if (dedupeCache.get(url) === entry) dedupeCache.delete(url);
  });
  return p;
}
