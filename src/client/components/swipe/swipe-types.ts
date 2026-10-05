import type { SearchAdsBody } from '../search/search-types';

/** Decisão sobre um card do deck. */
export type SwipeDecision = 'like' | 'skip';
/** Ação gravada no `service_reactions`. `unlike` (descurtir em /curtidos) grava `skip`. */
export type SwipeAction = SwipeDecision | 'unlike';

/**
 * Pedido de um lote do deck (`fetchDeck`): filtros da busca, mais os uids já na fila (`p_exclude`)
 * e a faixa de preço (aplicada no cliente, como no /busca).
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
  city?: string | null;
  state?: string | null;
  address_count?: number | null;
};

export const SWIPE_BATCH = 20;
export const SWIPE_PREFETCH_AT = 5;
