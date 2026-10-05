import { SEARCH_RPC, type ServiceResult } from '../search/search-types';
import type { LikedItem, SwipeAction, SwipeDeckBody } from './swipe-types';

/**
 * Swipe só com resources (sem função no banco):
 * - decisões = resource `service_reactions` (upsert por usuário + anúncio);
 * - curtidos = resource `liked_services` (a mesma tabela com o anúncio embutido);
 * - deck = a busca (`fn_search_services`) menos o que o usuário já decidiu.
 */

/** Passados voltam ao deck depois desse prazo. */
const SKIP_TTL_MS = 7 * 86_400_000;
const DECK_SEARCH_PAGE = 50;
/** Teto de páginas da busca por lote (50 × 20 = 1000 candidatos, o mesmo de antes). */
const DECK_MAX_PAGES = 20;

type Reaction = { serviceUid: string; liked: boolean; updatedAt: string };

async function json<T>(res: Response, name: string): Promise<T> {
  // Não-OK lança: tratar como lista vazia escondia o erro atrás de "Acabou por aqui".
  if (!res.ok) throw new Error(`${name} ${res.status}`);
  return (await res.json()) as T;
}

/** Anúncios já decididos pelo usuário (curtidos sempre; passados dentro do prazo). Anônimo → vazio. */
async function decidedUids(signal?: AbortSignal): Promise<Set<string>> {
  const res = await fetch('/api/resources/service_reactions?pageSize=500', { signal });
  if (res.status === 401) return new Set();
  const { items = [] } = await json<{ items?: Reaction[] }>(res, 'service_reactions');
  const cutoff = Date.now() - SKIP_TTL_MS;
  return new Set(
    items.filter((r) => r.liked || Date.parse(r.updatedAt) > cutoff).map((r) => r.serviceUid)
  );
}

/** Mesma regra do /busca: sem preço (ou <= 0) é "Sob consulta" e passa por qualquer faixa. */
function inPriceRange(r: ServiceResult, min: number | null, max: number | null): boolean {
  const price = r.price == null ? null : Number(r.price);
  if (price == null || price <= 0) return true;
  return (min == null || price >= min) && (max == null || price <= max);
}

export async function fetchDeck(body: SwipeDeckBody, signal?: AbortSignal): Promise<ServiceResult[]> {
  const { p_exclude, p_price_min, p_price_max, ...search } = body;
  const skip = await decidedUids(signal);
  for (const uid of p_exclude ?? []) skip.add(uid);

  const deck: ServiceResult[] = [];
  for (let page = 0; page < DECK_MAX_PAGES && deck.length < body.p_page_size; page += 1) {
    const res = await fetch(`/api/resources/${SEARCH_RPC}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...search, p_page: page, p_page_size: DECK_SEARCH_PAGE }),
      signal,
    });
    const { items = [] } = await json<{ items?: ServiceResult[] }>(res, SEARCH_RPC);
    for (const item of items) {
      if (skip.has(item.uid) || !inPriceRange(item, p_price_min, p_price_max)) continue;
      skip.add(item.uid);
      deck.push(item);
    }
    if (items.length < DECK_SEARCH_PAGE) break;
  }
  return deck.slice(0, body.p_page_size);
}

/** `like` curte; `skip` passa; `unlike` (descurtir em /curtidos) volta a ser `skip`. */
export async function recordSwipe(uids: string[], action: SwipeAction): Promise<void> {
  await Promise.all(
    uids.map(async (serviceUid) => {
      const res = await fetch('/api/resources/service_reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceUid, liked: action === 'like' }),
      });
      await json(res, 'service_reactions');
    })
  );
}

export async function fetchLiked(page: number, pageSize: number): Promise<LikedItem[]> {
  const qs = new URLSearchParams({
    'filter.action': 'like',
    'filter.service.active': 'true',
    'filter.service.status': 'active',
    orderBy: 'updated_at',
    orderDirection: 'desc',
    page: String(page),
    pageSize: String(pageSize),
  });
  const res = await fetch(`/api/resources/liked_services?${qs}`);
  const { items = [] } = await json<{ items?: LikedItem[] }>(res, 'liked_services');
  return items;
}
