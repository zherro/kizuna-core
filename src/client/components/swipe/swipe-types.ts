import type { SearchAdsBody } from '../search/search-types';

/** Decisão sobre um card do deck. */
export type SwipeDecision = 'like' | 'skip';
/**
 * `p_action` de `fn_swipe_record`. `skip` nunca rebaixa um `like` já gravado; `unlike`
 * (descurtir explícito, /curtidos) grava `skip` sobrescrevendo o `like`.
 */
export type SwipeAction = SwipeDecision | 'unlike';

/**
 * Corpo do `POST /api/resources/fn_swipe_deck` — filtros da busca, sempre página 0, mais a
 * faixa de preço (que o /busca aplica no cliente e o deck aplica no SQL).
 */
export type SwipeDeckBody = Omit<SearchAdsBody, 'p_page'> & {
  p_exclude: string[] | null;
  p_price_min: number | null;
  p_price_max: number | null;
};

export type LikedItem = {
  uid: string;
  title: string;
  price: number | null;
  price_type: string;
  category: string | null;
  cover_file_id: string | null;
  liked_at: string;
};

export const SWIPE_BATCH = 20;
export const SWIPE_PREFETCH_AT = 5;
