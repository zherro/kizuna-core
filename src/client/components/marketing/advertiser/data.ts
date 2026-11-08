/**
 * Acesso a dados do painel do anunciante: SEMPRE `cache: 'no-store'`, consulta direta pela rota
 * genérica `/api/resources/<recurso>` (RLS decide o que cada um vê). Nada de função/RPC.
 */
export type Page<T> = { items: T[]; total: number; page: number; pageSize: number; totalPages: number };
export type Filters = Record<string, string | number | boolean | null | undefined>;

export class ApiError extends Error {}

function qs(params: Record<string, string | number>, filters?: Filters): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) q.set(k, String(v));
  for (const [k, v] of Object.entries(filters ?? {})) {
    if (v !== undefined && v !== null && v !== '') q.set(`filter.${k}`, String(v));
  }
  return q.toString();
}

/** Traduz a recusa de RLS/CHECK mais comum em frase que o anunciante entende. */
export function friendly(message?: string, details?: string, status?: number): string {
  const text = `${message ?? ''} ${details ?? ''}`.toLowerCase();
  if (text.includes('daily_chk')) return 'A diária deve ficar entre R$ 5,00 e R$ 10.000,00.';
  if (text.includes('period_chk')) return 'O período máximo é de 90 dias e o fim não pode ser antes do início.';
  if (text.includes('row-level security') || status === 403) {
    return 'Não foi possível criar: confira se o saldo cobre o período, as datas e se o anúncio está publicado.';
  }
  if (status === 401) return 'Sua sessão expirou. Entre novamente.';
  return message || 'Não foi possível concluir. Tente novamente.';
}

async function parse<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => null)) as (T & { message?: string; details?: string }) | null;
  if (!res.ok) throw new ApiError(friendly(body?.message, body?.details, res.status));
  return body as T;
}

export async function fetchPage<T>(
  resource: string,
  opts: { page?: number; pageSize?: number; filters?: Filters } = {},
): Promise<Page<T>> {
  const res = await fetch(
    `/api/resources/${resource}?${qs({ page: opts.page ?? 1, pageSize: opts.pageSize ?? 20, orderDirection: 'desc' }, opts.filters)}`,
    { cache: 'no-store', credentials: 'same-origin' },
  );
  return parse<Page<T>>(res);
}

/** Todas as páginas (com limite de segurança), para somar métricas. `truncated` avisa se cortou. */
export async function fetchAll<T>(
  resource: string,
  filters?: Filters,
  maxRows = 5000,
  pageSize = 1000,
): Promise<{ items: T[]; truncated: boolean }> {
  const items: T[] = [];
  for (let page = 1; items.length < maxRows; page++) {
    const r = await fetchPage<T>(resource, { page, pageSize, filters });
    items.push(...r.items);
    if (page >= r.totalPages || r.items.length === 0) return { items, truncated: false };
  }
  return { items, truncated: true };
}

export async function createItem<T = unknown>(resource: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/resources/${resource}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'same-origin',
  });
  const r = await parse<{ item: T }>(res);
  return r.item;
}

export async function patchItem<T = unknown>(resource: string, id: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/resources/${resource}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'same-origin',
  });
  const r = await parse<{ item: T }>(res);
  return r.item;
}
