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

export async function loadCategoryRail(
  target: string | CategoryRailTarget,
  options: {
    limit?: number;
    cityIbge?: string;
    /** Região: busca em cada cidade e junta (a 1ª da lista — a selecionada — vem primeiro). */
    cityIbges?: string[];
  } = {}
): Promise<CategoryRailData | null> {
  const limit =
    options.limit && options.limit > 0 ? Math.floor(options.limit) : DEFAULT_CATEGORY_RAIL_LIMIT;
  const resolved = typeof target === 'string' ? { slug: target } : target;
  const kind = resolved.group ? 'group' : 'category';
  const slug = (resolved.group ?? resolved.slug ?? '').trim();
  if (!slug) return null;

  const rows = await serverFetchResource<TaxonomyRow>(
    kind === 'group' ? 'categories_group' : 'categories_public',
    { slug, active: 'true' },
    { auth: null, limit: 1 }
  ).catch(() => []);
  const row = rows[0];
  const id = Number(row?.id);
  if (!row || !Number.isFinite(id)) return null;

  const poolSize = limit * CATEGORY_RAIL_POOL_FACTOR;
  const filter = kind === 'group' ? { p_group_category_slug: row.slug } : { p_category_id: id };
  const seed = Math.random() * 2 - 1;
  const cities = options.cityIbges?.length ? options.cityIbges : [options.cityIbge ?? null];
  const perCity = await Promise.all(
    cities.map((city) =>
      runServiceSearch({ ...filter, p_page_size: poolSize, p_city_ibge: city }, seed).catch(() => [])
    )
  );
  const seen = new Set<string>();
  const items = perCity.flat().filter((item) => {
    const key = String((item as { uid?: unknown }).uid ?? '');
    if (!key || seen.has(key)) return !key;
    seen.add(key);
    return true;
  });
  if (items.length === 0) return null;

  return {
    kind,
    category: { id, name: row.name, slug: row.slug },
    items: items.slice(0, poolSize),
    limit,
    hasMore: items.length > limit,
  };
}
