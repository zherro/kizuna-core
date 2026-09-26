/**
 * Tipos compartilhados da busca conversacional (plugin `search`, rota `/busca`).
 *
 * Fonte única do contrato entre: `useSearchFilters` (estado ↔ URL), a rota
 * `POST /api/ai/search-chat` (request/response), o `search-agent` server-side e os
 * componentes de UI (`SearchChat`, `SearchResultsView`, `SearchFiltersPanel`).
 *
 * Sem runtime code — só `type`.
 */

export type SearchSort = 'relevance' | 'price' | 'rating';

export type ServiceResult = {
  uid: string;
  title: string;
  price: number | null;
  price_type: string;
  category: string | null;
  subcategory: string | null;
  sponsored: boolean;
  cover_file_id: string | null;
  provider_name: string | null;
  provider_avatar: string | null;
  /** Média de avaliações publicadas (plugin `reviews`); `null` quando o serviço ainda não tem nenhuma. */
  rating: number | null;
  /** Total de avaliações publicadas; `0` quando não tem. */
  reviews: number;
  /** Cidade do endereço principal (sem rua/número). Ausente em RPCs antigas. */
  city?: string | null;
  /** UF do endereço principal. */
  state?: string | null;
  /** Total de endereços ativos do serviço. */
  address_count?: number | null;
};

export type SearchFilters = {
  /** sigla UF, ex. "PR" — sempre presente depois que a página passa do LocationGate */
  state: string;
  /** id IBGE da cidade; `null` = estado inteiro */
  cityId: number | null;
  cityName: string | null;
  groupSlug: string | null;
  categoryId: number | null;
  subcategoryIds: number[];
  query: string | null;
  priceMin: number | null;
  priceMax: number | null;
  sort: SearchSort;
};

export type SearchFilterPatch = Partial<SearchFilters>;

/** O que a IA pode preencher. Subconjunto de `SearchFilters`, sem localização nem `sort`. */
export type AgentFilter = {
  groupSlug?: string | null;
  categoryId?: number | null;
  subcategoryIds?: number[];
  query?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
};

export type SearchChatMessage = { role: 'user' | 'assistant'; content: string };

export type SearchChatRequest = {
  messages: SearchChatMessage[];
  location: { state: string; cityId: number | null; cityName: string | null };
  filtrosAtuais: AgentFilter;
};

export type SearchChatResponse = {
  mensagem_usuario: string;
  filtro: AgentFilter | null;
  precisa_mais_info: boolean;
  resumo: string;
};

/** Nome da RPC de busca (plugin `search`), exposta por `POST /api/resources/<nome>`. */
export const SEARCH_RPC = 'fn_search_services';

/** Corpo do `POST /api/resources/fn_search_services`. */
export type SearchAdsBody = {
  p_state: string | null;
  p_city_id: number | null;
  /** código IBGE da cidade do prestador — filtro exato (`user_data.city_ibge`); `null` = estado inteiro */
  p_city_ibge: string | null;
  p_group_category_slug: string | null;
  p_category_id: number | null;
  p_subcategories: number[] | null;
  p_query: string | null;
  p_seed: number;
  p_page: number;
  p_page_size: number;
};

export type TaxonomySubcategory = { id: number; name: string };
export type TaxonomyCategory = { id: number; name: string; subcategories: TaxonomySubcategory[] };
export type TaxonomyGroup = { slug: string; name: string };
export type TaxonomySnapshot = {
  groups: TaxonomyGroup[];
  categories: TaxonomyCategory[];
  loadedAt: number;
};
