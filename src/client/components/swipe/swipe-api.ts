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

export async function fetchDeck(body: SwipeDeckBody, signal?: AbortSignal): Promise<ServiceResult[]> {
  const res = await rpc('fn_swipe_deck', body, signal);
  const data = (await res.json().catch(() => null)) as { items?: unknown[] } | null;
  return Array.isArray(data?.items) ? (data.items as ServiceResult[]) : [];
}

export async function recordSwipe(uids: string[], action: SwipeAction): Promise<void> {
  if (uids.length === 0) return;
  const res = await rpc('fn_swipe_record', { p_service_uids: uids, p_action: action });
  if (!res.ok) throw new Error(`fn_swipe_record ${res.status}`);
}

export async function fetchLiked(page: number, pageSize: number): Promise<LikedItem[]> {
  const res = await rpc('fn_swipe_liked', { p_page: page, p_page_size: pageSize });
  const data = (await res.json().catch(() => null)) as { items?: unknown[] } | null;
  return Array.isArray(data?.items) ? (data.items as LikedItem[]) : [];
}
