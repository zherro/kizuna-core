import type { ServiceResult } from '../search/search-types';
import type { LikedItem, SwipeAction, SwipeDeckBody } from './swipe-types';

async function rpc(name: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  return fetch(`/api/resources/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
}

async function readItems<T>(name: string, res: Response): Promise<T[]> {
  // Não-OK (404 RPC não suportada, PGRST202, 401, 500) lança: tratar como lista vazia
  // escondia o erro atrás de "Acabou por aqui" / "Você ainda não curtiu nada".
  if (!res.ok) throw new Error(`${name} ${res.status}`);
  const data = (await res.json().catch(() => null)) as { items?: unknown[] } | null;
  return Array.isArray(data?.items) ? (data.items as T[]) : [];
}

export async function fetchDeck(body: SwipeDeckBody, signal?: AbortSignal): Promise<ServiceResult[]> {
  return readItems<ServiceResult>('fn_swipe_deck', await rpc('fn_swipe_deck', body, signal));
}

export async function recordSwipe(uids: string[], action: SwipeAction): Promise<void> {
  if (uids.length === 0) return;
  const res = await rpc('fn_swipe_record', { p_service_uids: uids, p_action: action });
  if (!res.ok) throw new Error(`fn_swipe_record ${res.status}`);
}

export async function fetchLiked(before: string | null, pageSize: number): Promise<LikedItem[]> {
  return readItems<LikedItem>('fn_swipe_liked', await rpc('fn_swipe_liked', { p_before: before, p_page_size: pageSize }));
}
