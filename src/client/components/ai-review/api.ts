/** Helpers de fetch das telas de revisão de textos por IA (rotas `/api/ai/*` e `/api/resources/*`). */

export const SELECT_CLASS =
  'flex h-10 w-full rounded-[var(--ui-radius-field,0.375rem)] border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

export class ApiError extends Error {}

export async function apiJson<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
  });
  const data = (await res.json().catch(() => null)) as (T & { message?: string }) | null;
  if (!res.ok) throw new ApiError(data?.message ?? `Erro ${res.status}`);
  return data as T;
}

export async function listResource<T>(
  resource: string,
  params: Record<string, string | number | undefined> = {}
): Promise<{ items: T[]; total: number }> {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, String(v));
  const data = await apiJson<{ items?: T[]; total?: number }>(`/api/resources/${resource}?${q}`);
  return { items: data.items ?? [], total: data.total ?? 0 };
}

export async function readConfigKey<T>(key: string): Promise<T | undefined> {
  try {
    const res = await fetch(`/api/resources/system_config/${encodeURIComponent(key)}`);
    if (!res.ok) return undefined;
    return ((await res.json()) as { item?: { value?: T } }).item?.value;
  } catch {
    return undefined;
  }
}

export async function saveConfigKey(key: string, value: unknown): Promise<void> {
  const res = await fetch(`/api/resources/system_config/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  });
  if (!res.ok) throw new ApiError('Não foi possível salvar a configuração.');
}

/** HTML do anúncio → texto simples (a descrição original é conteúdo de usuário: nunca injetar como HTML). */
export function htmlToText(html: string): string {
  return String(html ?? '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|div|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface CategoryOption {
  id: number;
  name: string;
  aiReview: boolean;
}

export interface RunInfo {
  id: number | string;
  categoryId: number | null;
  status: string;
  total: number;
  processed: number;
  failed: number;
  tokensIn: number;
  tokensOut: number;
  error: string | null;
  createdAt?: string;
  finishedAt?: string | null;
}
