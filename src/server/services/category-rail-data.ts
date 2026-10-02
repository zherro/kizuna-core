import { serverFetchResource } from '../postgrest-crud';
import type { ServiceResult } from '../../client/components/search/search-types';
import { runServiceSearch, seedFromKey } from './service-search';

/**
 * Dados de um carrossel "por categoria" (home). Genérico: só conhece o slug que o projeto passa —
 * quais categorias viram carrossel é config do consumidor (`home.categoryRails`), nunca hardcoded.
 * Reusa a mesma RPC pública da busca, então os cards têm preço/imagem/estilo reais.
 */

export const DEFAULT_CATEGORY_RAIL_LIMIT = 10;

type CategoryRow = { id: number | string; name: string; slug: string };

export type CategoryRailData = {
  category: { id: number; name: string; slug: string };
  items: ServiceResult[];
  /** `true` quando vieram todos os `limit` itens — provavelmente há mais na categoria, então a
   * trilha mostra o card "Ver mais" no fim. */
  hasMore: boolean;
};

export async function loadCategoryRail(
  slug: string,
  options: { limit?: number; cityIbge?: string } = {}
): Promise<CategoryRailData | null> {
  const limit =
    options.limit && options.limit > 0 ? Math.floor(options.limit) : DEFAULT_CATEGORY_RAIL_LIMIT;

  const categories = await serverFetchResource<CategoryRow>(
    'categories_public',
    { slug, active: 'true' },
    { auth: null, limit: 1 }
  ).catch(() => []);
  const row = categories[0];
  const id = Number(row?.id);
  if (!row || !Number.isFinite(id)) return null;

  const items = await runServiceSearch(
    { p_category_id: id, p_page_size: limit, p_city_ibge: options.cityIbge ?? null },
    seedFromKey(`rail:${slug}${options.cityIbge ? `:${options.cityIbge}` : ''}`)
  );
  if (items.length === 0) return null;

  return {
    category: { id, name: row.name, slug: row.slug },
    items: items.slice(0, limit),
    hasMore: items.length >= limit,
  };
}
