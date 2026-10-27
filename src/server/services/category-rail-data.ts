import { unstable_cache } from 'next/cache';
import { serverFetchResource } from '../postgrest-crud';
import type { ServiceResult } from '../../client/components/search/search-types';
import { runServiceSearch } from './service-search';

/**
 * Dados de um carrossel "por categoria" ou "por grupo de categoria" (home). Genérico: só conhece o
 * slug que o projeto passa — quais trilhas existem é config do consumidor (`home.categoryRails`),
 * nunca hardcoded. Usa a MESMA RPC pública da busca (`fn_search_services`), então valem os mesmos
 * filtros (ativo, não expirado, cidade) e os cards têm preço/imagem/estilo reais.
 *
 * Aleatoriedade: a página da home é ISR, então embaralhar aqui congelaria a ordem para todo mundo
 * até o próximo revalidate. Por isso o servidor devolve um `pool` maior (seed aleatório a cada
 * geração) e quem exibe embaralha no navegador e corta em `limit` (`ShuffledServiceCarouselSection`).
 */

export const DEFAULT_CATEGORY_RAIL_LIMIT = 10;
/** Quantas vezes o `limit` o pool traz, pra o embaralhamento no cliente ter de onde variar. */
export const CATEGORY_RAIL_POOL_FACTOR = 3;

type TaxonomyRow = { id: number | string; name: string; slug: string };

export type CategoryRailTarget =
  /** slug da categoria (`categories.slug`) */
  | { slug: string; group?: never }
  /** slug do grupo de categoria (`categories_group.slug`) */
  | { group: string; slug?: never };

export type CategoryRailData = {
  kind: 'category' | 'group';
  category: { id: number; name: string; slug: string };
  /** Pool (até `limit * CATEGORY_RAIL_POOL_FACTOR`) — quem exibe embaralha e mostra `limit`. */
  items: ServiceResult[];
  limit: number;
  /** `true` quando há mais itens do que `limit` — a trilha mostra o card "Ver mais" no fim. */
  hasMore: boolean;
};

type CategoryRailOptions = {
  limit?: number;
  cityIbge?: string;
  /** Cidades irmãs (`regions`): a 1ª é a selecionada; o filtro vale para qualquer uma delas. */
  cityIbges?: string[];
};

/** TTL do cache dos dados da trilha (s): a home não muda a cada segundo; poupa o PostgREST. */
export const CATEGORY_RAIL_CACHE_SECONDS = 300;

// Sem `.catch` aqui de propósito: erro precisa propagar pra NÃO ser cacheado (senão uma falha
// momentânea congelaria a trilha vazia por 5 min). Quem chama trata. "Sem anúncios" (null) cacheia.
async function fetchCategoryRail(
  kind: 'category' | 'group',
  slug: string,
  limit: number,
  cityIbge: string | undefined,
  cityIbges: string[] | undefined
): Promise<CategoryRailData | null> {
  const rows = await serverFetchResource<TaxonomyRow>(
    kind === 'group' ? 'categories_group' : 'categories_public',
    { slug, active: 'true' },
    { auth: null, limit: 1 }
  );
  const row = rows[0];
  const id = Number(row?.id);
  if (!row || !Number.isFinite(id)) return null;

  const poolSize = limit * CATEGORY_RAIL_POOL_FACTOR;
  const filter = kind === 'group' ? { p_group_category_slug: row.slug } : { p_category_id: id };
  const seed = Math.random() * 2 - 1;
  const cities = cityIbges?.length ? cityIbges : null;
  const items = await runServiceSearch(
    {
      ...filter,
      p_page_size: poolSize,
      p_city_ibge: cities?.[0] ?? cityIbge ?? null,
      // só manda quando há irmãs — sem a chave, a RPC aceita a assinatura antiga também
      ...(cities && cities.length > 1 ? { p_city_ibges: cities } : {}),
    },
    seed
  );
  if (items.length === 0) return null;

  return {
    kind,
    category: { id, name: row.name, slug: row.slug },
    items: items.slice(0, poolSize),
    limit,
    hasMore: items.length > limit,
  };
}

const cachedCategoryRail = unstable_cache(fetchCategoryRail, ['category-rail'], {
  revalidate: CATEGORY_RAIL_CACHE_SECONDS,
  tags: ['category-rail'],
});

export async function loadCategoryRail(
  target: string | CategoryRailTarget,
  options: CategoryRailOptions = {}
): Promise<CategoryRailData | null> {
  const limit =
    options.limit && options.limit > 0 ? Math.floor(options.limit) : DEFAULT_CATEGORY_RAIL_LIMIT;
  const resolved = typeof target === 'string' ? { slug: target } : target;
  const kind = resolved.group ? 'group' : 'category';
  const slug = (resolved.group ?? resolved.slug ?? '').trim();
  if (!slug) return null;

  return cachedCategoryRail(kind, slug, limit, options.cityIbge, options.cityIbges).catch(() => null);
}
