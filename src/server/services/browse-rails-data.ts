import { unstable_cache } from 'next/cache';
import { serverFetchResource } from '../postgrest-crud';
import type { SearchAdsBody, ServiceResult } from '../../client/components/search/search-types';
import {
  RAIL_LIMIT,
  buildRail,
  orderForGroup,
  type BrowseRail,
  type BrowseRailsData,
} from '../../shared/search/browse-rails';
import { runServiceSearchStrict } from './service-search';

/**
 * Trilhas da vitrine da /busca (`search.browseGroups`) renderizadas no servidor para UMA cidade
 * (a padrão do projeto): a casca da página é ISR e as trilhas já vêm no HTML, sem o ~6 POST de
 * `fn_search_services` após hidratar. Mesmo corpo de RPC que `SearchBrowseRails` monta no cliente
 * (que segue sendo o caminho para outra cidade). Cache por tempo + tag (`revalidateAdPages`).
 */

export type { BrowseRailsData };

export const BROWSE_RAILS_TAG = 'browse-rails';
/** TTL do cache (s): igual ao `revalidate` da página. */
export const BROWSE_RAILS_CACHE_SECONDS = 300;

export type LoadBrowseRailsOptions = {
  rails: BrowseRail[];
  /** Cidade selecionada (IBGE). */
  cityIbge: string;
  /** Selecionada + irmãs (`regionCitiesFor`), a selecionada primeiro. Omitido = só a selecionada. */
  cityIbges?: string[];
  state?: string | null;
  /** `search.orderByGroup`. */
  orderByGroup?: Record<string, string>;
};

// Sem `.catch` aqui de propósito: erro precisa propagar pra NÃO ser cacheado (senão uma falha
// momentânea congelaria a vitrine vazia por 5 min). Trilha vazia legítima cacheia.
async function fetchBrowseRails(
  rails: BrowseRail[],
  cityIbge: string,
  cityIbges: string[],
  state: string | null,
  orders: Record<string, string>,
  pageSize: number
): Promise<BrowseRailsData> {
  const cities = cityIbges.length ? cityIbges : [cityIbge];
  // Seed fora da chave de cache: sorteado a cada regeneração (como a home).
  const seed = Math.random() * 2 - 1;

  const fetchGroup = (slug: string): Promise<ServiceResult[]> => {
    const order = orders[slug] ?? 'relevance';
    const body: Partial<SearchAdsBody> = {
      p_state: state,
      p_city_id: Number(cities[0]),
      p_city_ibge: cities[0],
      p_city_ibges: cities,
      p_group_category_slug: slug,
      p_page: 0,
      p_page_size: pageSize,
    };
    // como na busca: só manda `p_order` com ordenação configurada (RPC antiga recusa a chave)
    if (order !== 'relevance') body.p_order = order;
    return runServiceSearchStrict(body, seed);
  };

  const [loaded, names] = await Promise.all([
    Promise.all(
      rails.map(async (rail) => buildRail(rail, await Promise.all(rail.groups.map(fetchGroup))))
    ),
    serverFetchResource<{ slug: string; name: string }>('categories_group', { active: 'true' }, { auth: null }),
  ]);

  const used = new Set(rails.flatMap((r) => r.groups));
  const groupNames: Record<string, string> = {};
  for (const row of names) if (used.has(row.slug) && row.name) groupNames[row.slug] = row.name;

  return { cityIbge, signature: JSON.stringify(rails), rails: loaded, groupNames };
}

const cachedBrowseRails = unstable_cache(fetchBrowseRails, ['browse-rails:v1'], {
  revalidate: BROWSE_RAILS_CACHE_SECONDS,
  tags: ['services', BROWSE_RAILS_TAG],
});

/** `null` = falhou (o cliente cai no fetch de sempre). */
export async function loadBrowseRails(options: LoadBrowseRailsOptions): Promise<BrowseRailsData | null> {
  const { rails, cityIbge } = options;
  if (!rails.length || !cityIbge) return null;
  const orders: Record<string, string> = {};
  for (const slug of new Set(rails.flatMap((r) => r.groups))) {
    orders[slug] = orderForGroup(options.orderByGroup, slug);
  }
  return cachedBrowseRails(
    rails,
    cityIbge,
    options.cityIbges ?? [],
    options.state ?? null,
    orders,
    RAIL_LIMIT
  ).catch(() => null);
}
