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
  /** slug da categoria — chave estável pra escolher estilo de card por categoria (ver
   * `resolveServiceDetailVariant`); ausente em RPCs antigas. */
  category_slug?: string | null;
  /** slug do grupo de categorias do anúncio (`categories_group.slug`) — chave pra escolher layout
   * por grupo (`serviceDetail.variantByGroupSlug`); ausente em RPCs anteriores à 0005. */
  category_group_slug?: string | null;
  /** Início do evento (`answers.data_inicio`, AAAA-MM-DDTHH:MM local) — só anúncios com formulário de evento; ausente em RPCs antigas. */
  event_start?: string | null;
  /** Nome do local do endereço (`service_addresses.label`, ex. "Arena Pantanal"); ausente em RPCs antigas. */
  venue?: string | null;
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
  /** Categorias marcadas (todas do mesmo grupo). Vazio = sem filtro de categoria. */
  categoryIds: number[];
  subcategoryIds: number[];
  /**
   * Cidades escolhidas no filtro (códigos IBGE). `null` = o padrão: a cidade do cabeçalho + as
   * irmãs da região. `[]` = o usuário tirou todas → o estado inteiro.
   */
  cityIds: string[] | null;
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
  /** Várias categorias (mesmo grupo) — `fn_search_services` 0006. Convive com `p_category_id`. */
  p_category_ids?: number[] | null;
  p_subcategories: number[] | null;
  p_query: string | null;
  p_seed: number;
  p_page: number;
  p_page_size: number;
  /** Slugs de categoria fora do resultado quando a busca NÃO filtra por `p_category_id` (mixed
   * results) — ver `ServiceDetailConfig.excludeFromMixedCategorySlugs`. Ausente/`null` = nada
   * excluído (comportamento anterior). */
  p_exclude_category_slugs?: string[] | null;
  /** Cidades irmãs (`regions`): quando presente, o filtro de cidade vale para QUALQUER uma delas;
   * `p_city_ibge` continua sendo a selecionada (vem primeiro na ordem). Preenchido pelo proxy
   * (`withRegionCities`) ou por quem chama a RPC direto no servidor. */
  p_city_ibges?: string[] | null;
  /** Tags de `services.extras.tags` (`fn_search_services` 0008, semântica ANY: o anúncio tem pelo
   * menos uma). Ausente/`null`/`[]` = sem filtro. Só mande quando houver tags — sem a chave, a RPC
   * anterior à 0008 continua aceitando a chamada. */
  p_tags?: string[] | null;
  /** Valores de `services.extras.local_ref` (uid ou código do lugar; `fn_search_services` 0009).
   * Com `p_tags`, vale um OU outro. Só mande quando houver — a RPC anterior à 0009 recusa a chave. */
  p_local_refs?: string[] | null;
};

export type TaxonomySubcategory = { id: number; name: string };
export type TaxonomyCategory = { id: number; name: string; subcategories: TaxonomySubcategory[] };
export type TaxonomyGroup = { slug: string; name: string };
export type TaxonomySnapshot = {
  groups: TaxonomyGroup[];
  categories: TaxonomyCategory[];
  loadedAt: number;
};
