import type { ServiceResult } from '../../client/components/search/search-types';
import { normalizeServiceTags } from '../../shared/service-tags';
import { runServiceSearch } from './service-search';
import { CATEGORY_RAIL_POOL_FACTOR, DEFAULT_CATEGORY_RAIL_LIMIT } from './category-rail-data';

/**
 * Dados de um carrossel "por tag" (`services.extras.tags`): anúncios que têm PELO MENOS UMA das
 * tags (ex.: a casa de festas e os eventos dela compartilham `local:<slug-da-casa>`). Genérico:
 * quais tags existem é dado do anúncio/config do consumidor, nunca hardcoded. Usa a MESMA RPC
 * pública da busca (`fn_search_services` com `p_tags`), então valem os mesmos filtros (ativo, não
 * expirado, cidade/irmãs) e os cards têm preço/imagem/estilo reais.
 *
 * Mesmo estilo do `loadCategoryRail`: devolve um `pool` (até `limit * CATEGORY_RAIL_POOL_FACTOR`)
 * e `hasMore`; quem exibe embaralha no navegador (`ShuffledServiceCarouselSection`) ou mostra os
 * primeiros `limit`.
 */

export type ServiceTagRailData = {
  /** Tags pedidas, normalizadas (minúsculas, sem vazias/repetidas). */
  tags: string[];
  /** Pool (até `limit * CATEGORY_RAIL_POOL_FACTOR`), já sem `excludeUid(s)`. */
  items: ServiceResult[];
  limit: number;
  /** `true` quando há mais itens do que `limit`. */
  hasMore: boolean;
};

export type LoadServicesByTagsOptions = {
  limit?: number;
  cityIbge?: string;
  /** Cidades irmãs (`regions`): a 1ª é a selecionada; o filtro vale para qualquer uma delas. */
  cityIbges?: string[];
  /** Anúncio que não entra na lista (o próprio, na tela de detalhe). */
  excludeUid?: string;
  /** Outros uids fora da lista (ex.: já mostrados por outro carrossel da mesma página). */
  excludeUids?: Iterable<string>;
  /** Seed do `setseed()` da RPC. Default: aleatória a cada geração (como o rail de categoria);
   * passe `seedFromKey(...)` para a ordem ficar estável numa página em cache. */
  seed?: number;
};

/** Corpo parcial da RPC para um carrossel por tag — puro (testável). `null` = sem tag válida. */
export function buildTagSearchParams(
  tags: unknown,
  options: Pick<LoadServicesByTagsOptions, 'cityIbge' | 'cityIbges'> & { pageSize: number }
) {
  const normalized = normalizeServiceTags(tags);
  if (normalized.length === 0) return null;
  const cities = options.cityIbges?.length ? options.cityIbges : null;
  return {
    p_tags: normalized,
    p_page_size: options.pageSize,
    p_city_ibge: cities?.[0] ?? options.cityIbge ?? null,
    // só manda quando há irmãs — sem a chave, a RPC aceita a assinatura antiga também
    ...(cities && cities.length > 1 ? { p_city_ibges: cities } : {}),
  };
}

export async function loadServicesByTags(
  tags: unknown,
  options: LoadServicesByTagsOptions = {}
): Promise<ServiceTagRailData | null> {
  const limit =
    options.limit && options.limit > 0 ? Math.floor(options.limit) : DEFAULT_CATEGORY_RAIL_LIMIT;
  const poolSize = limit * CATEGORY_RAIL_POOL_FACTOR;
  const exclude = new Set<string>(options.excludeUids ?? []);
  if (options.excludeUid) exclude.add(options.excludeUid);

  // pede a mais o que pode sair no filtro de exclusão, pra o pool não encolher
  const params = buildTagSearchParams(tags, { ...options, pageSize: poolSize + exclude.size });
  if (!params) return null;

  const seed = options.seed ?? Math.random() * 2 - 1;
  const rows = await runServiceSearch(params, seed).catch(() => []);
  const items = rows.filter((row) => !exclude.has(row.uid)).slice(0, poolSize);
  if (items.length === 0) return null;

  return { tags: params.p_tags, items, limit, hasMore: items.length > limit };
}
