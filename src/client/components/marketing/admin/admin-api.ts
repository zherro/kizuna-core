/**
 * Acesso a dados do painel admin de marketing: SEMPRE `cache: 'no-store'`, consulta direta pela
 * rota genérica `/api/resources/<recurso>` (RLS decide o que o admin enxerga). Sem função SQL.
 *
 * Sempre passa `orderBy` + `orderDirection` explícitos: um `defaultOrder` com ".desc" no
 * ResourceConfig viraria `coluna.desc.asc` na query do PostgREST.
 */

export type Row = Record<string, unknown>;

type ListPage<T> = { items?: T[]; message?: string; total?: number };

export type FetchAllOptions<T> = {
  pageSize?: number;
  maxPages?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, string>;
  /** Para a paginação quando a última página lida já passou do que interessa (lista ordenada). */
  stopWhen?: (lastPageItems: T[]) => boolean;
};

export async function fetchAll<T = Row>(resource: string, opts: FetchAllOptions<T> = {}): Promise<T[]> {
  const pageSize = opts.pageSize ?? 200;
  const maxPages = opts.maxPages ?? 10;
  const out: T[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const params = new URLSearchParams({ pageSize: String(pageSize), page: String(page) });
    if (opts.orderBy) {
      params.set('orderBy', opts.orderBy);
      params.set('orderDirection', opts.orderDirection ?? 'asc');
    }
    if (opts.search) params.set('search', opts.search);
    for (const [k, v] of Object.entries(opts.filters ?? {})) params.set(`filter.${k}`, v);
    const res = await fetch(`/api/resources/${resource}?${params.toString()}`, {
      cache: 'no-store',
      credentials: 'same-origin',
    });
    const body = (await res.json().catch(() => null)) as ListPage<T> | null;
    if (!res.ok) throw new Error(body?.message ?? 'Não foi possível carregar os dados.');
    const items = body?.items ?? [];
    out.push(...items);
    if (items.length < pageSize) break;
    if (opts.stopWhen?.(items)) break;
  }
  return out;
}

export async function send(
  method: 'POST' | 'PATCH',
  path: string,
  payload: Row,
  fallback: string,
): Promise<void> {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string; details?: string } | null;
    throw new Error(body?.details || body?.message || fallback);
  }
}

export const errMsg = (err: unknown, fallback: string): string => (err instanceof Error && err.message ? err.message : fallback);
