import type { SearchAdsBody } from '../search/search-types';

export type SwipeAction = 'like' | 'skip';

/** Corpo do `POST /api/resources/fn_swipe_deck` — filtros da busca, sempre página 0. */
export type SwipeDeckBody = Omit<SearchAdsBody, 'p_page'> & { p_exclude: string[] | null };

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
