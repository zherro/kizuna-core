'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { regionCitiesFor, type RegionConfig } from '../../../shared/regions';
import type {
  AgentFilter,
  SearchAdsBody,
  SearchFilterPatch,
  SearchFilters,
  SearchSort,
} from './search-types';

type Location = { state: string; cityId: number | null; cityName: string | null };

const PAGE_SIZE = 24;

function parseIntOrNull(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

function parseIdList(value: string | null): number[] {
  if (!value) return [];
  return [
    ...new Set(
      value
        .split(',')
        .map((part) => Number(part.trim()))
        .filter((n) => Number.isFinite(n) && n > 0)
        .map((n) => Math.trunc(n))
    ),
  ];
}

/** Valor da URL (`?cidades=`) usado para "estado inteiro" (o usuário tirou todas as cidades). */
const ALL_STATE = 'estado';

/** `?cidades=` → `null` (ausente = padrão), `[]` (`estado`) ou a lista de IBGE (sem repetidas). */
export function parseCityIds(value: string | null): string[] | null {
  if (value == null || value.trim() === '') return null;
  if (value.trim().toLowerCase() === ALL_STATE) return [];
  const ids = [
    ...new Set(
      value
        .split(',')
        .map((part) => part.trim())
        .filter((part) => /^\d{5,8}$/.test(part))
    ),
  ];
  return ids.length ? ids : null;
}

/** Inverso de `parseCityIds` — `null` não escreve nada na URL. */
export function serializeCityIds(ids: string[] | null): string | null {
  if (ids == null) return null;
  return ids.length ? ids.join(',') : ALL_STATE;
}

/**
 * Categorias da URL: `?categoryIds=1,2` (atual) ou o `?categoryId=3` antigo (links do carrossel, da
 * home e do sitemap continuam funcionando).
 */
export function parseCategoryIds(params: URLSearchParams): number[] {
  const list = parseIdList(params.get('categoryIds'));
  if (list.length) return list;
  const legacy = parseIntOrNull(params.get('categoryId'));
  return legacy ? [legacy] : [];
}

/**
 * Quantos filtros estão ativos (grupo, cada categoria, cada especialidade, cidades editadas, texto,
 * faixa de preço). Localização padrão (cabeçalho) e ordenação não contam.
 */
export function countActiveFilters(f: SearchFilters): number {
  return (
    (f.groupSlug ? 1 : 0) +
    f.categoryIds.length +
    f.subcategoryIds.length +
    (f.cityIds != null ? 1 : 0) +
    (f.query ? 1 : 0) +
    (f.priceMin != null || f.priceMax != null ? 1 : 0)
  );
}

/**
 * O carrossel de categorias só some quando há categoria E mais algum filtro (especialidade, texto ou
 * preço). Só com a categoria ele continua — quem está navegando ainda quer ver as outras.
 */
export function shouldHideCategoryCarousel(f: SearchFilters): boolean {
  if (f.categoryIds.length === 0) return false;
  return f.subcategoryIds.length > 0 || Boolean(f.query) || f.priceMin != null || f.priceMax != null;
}

/**
 * Fonte única do estado de filtro da /busca, sincronizada com a URL (que é a fonte de verdade —
 * busca compartilhável). Escrita tanto pelo painel de filtro manual quanto pelo resultado da IA.
 */
export function useSearchFilters(
  location: Location,
  basePath = '/busca',
  /** Slugs de categoria fora do resultado quando a busca não filtra por uma categoria específica
   * (ver `ServiceDetailConfig.excludeFromMixedCategorySlugs`) — só entra no body quando não há
   * `categoryId`, então a categoria continua navegável sozinha. */
  excludeCategorySlugs: string[] = [],
  /** `regions` do kizuna.config.json — a cidade do cabeçalho entra no padrão junto das irmãs. */
  regions: RegionConfig[] = []
) {
  const router = useRouter();
  const params = useSearchParams();

  const filters = useMemo<SearchFilters>(() => {
    const sortParam = params.get('sort');
    return {
      // Cidade/estado vêm SEMPRE do seletor do topo (user_location) — nunca da URL, senão um link
      // antigo ou compartilhado buscaria noutra cidade.
      state: location.state,
      cityId: location.cityId,
      cityName: location.cityName,
      groupSlug: params.get('group') || null,
      categoryIds: parseCategoryIds(params),
      subcategoryIds: parseIdList(params.get('subcategoryIds')),
      cityIds: parseCityIds(params.get('cidades')),
      query: params.get('q')?.trim() || null,
      priceMin: parseIntOrNull(params.get('priceMin')),
      priceMax: parseIntOrNull(params.get('priceMax')),
      sort: (sortParam === 'price' || sortParam === 'rating'
        ? sortParam
        : 'relevance') as SearchSort,
    };
  }, [params, location.state, location.cityId, location.cityName]);

  const writeUrl = useCallback(
    (next: SearchFilters) => {
      const sp = new URLSearchParams();
      if (next.groupSlug) sp.set('group', next.groupSlug);
      if (next.categoryIds.length) sp.set('categoryIds', next.categoryIds.join(','));
      if (next.subcategoryIds.length) sp.set('subcategoryIds', next.subcategoryIds.join(','));
      const cidades = serializeCityIds(next.cityIds);
      if (cidades) sp.set('cidades', cidades);
      if (next.query) sp.set('q', next.query);
      if (next.priceMin != null) sp.set('priceMin', String(next.priceMin));
      if (next.priceMax != null) sp.set('priceMax', String(next.priceMax));
      if (next.sort !== 'relevance') sp.set('sort', next.sort);
      router.replace(`${basePath}?${sp.toString()}`, { scroll: false });
    },
    [router, basePath]
  );

  const setFilters = useCallback(
    (patch: SearchFilterPatch) => {
      const next: SearchFilters = { ...filters, ...patch };
      // trocar de categoria zera as subcategorias, a menos que o patch traga as novas
      if (
        patch.categoryIds !== undefined &&
        patch.subcategoryIds === undefined &&
        patch.categoryIds.join(',') !== filters.categoryIds.join(',')
      ) {
        next.subcategoryIds = [];
      }
      writeUrl(next);
    },
    [filters, writeUrl]
  );

  const resetFilters = useCallback(() => {
    writeUrl({
      state: location.state,
      cityId: location.cityId,
      cityName: location.cityName,
      groupSlug: null,
      categoryIds: [],
      subcategoryIds: [],
      cityIds: null,
      query: null,
      priceMin: null,
      priceMax: null,
      sort: 'relevance',
    });
  }, [location.state, location.cityId, location.cityName, writeUrl]);

  const applyAgentFilter = useCallback(
    (f: AgentFilter | null) => {
      if (!f) return;
      const patch: SearchFilterPatch = {};
      if (f.groupSlug !== undefined) patch.groupSlug = f.groupSlug ?? null;
      // a IA escolhe uma categoria só; o filtro manual pode ter várias
      if (f.categoryId !== undefined) patch.categoryIds = f.categoryId ? [f.categoryId] : [];
      if (f.subcategoryIds !== undefined) patch.subcategoryIds = f.subcategoryIds ?? [];
      if (f.query !== undefined) patch.query = f.query ?? null;
      if (f.priceMin !== undefined) patch.priceMin = f.priceMin ?? null;
      if (f.priceMax !== undefined) patch.priceMax = f.priceMax ?? null;
      if (Object.keys(patch).length > 0) setFilters(patch);
    },
    [setFilters]
  );

  // Cidades do padrão: a do cabeçalho (`cityId` já é o código IBGE) + as irmãs da região.
  const defaultCityIds = useMemo(
    () => (location.cityId ? regionCitiesFor(regions, location.cityId) : []),
    [location.cityId, regions]
  );
  const effectiveCityIds = useMemo(
    () => filters.cityIds ?? defaultCityIds,
    [filters.cityIds, defaultCityIds]
  );

  // Trocar a cidade no cabeçalho recomeça a seleção de cidades do filtro (a escolha era sobre a
  // cidade anterior). Só reage a uma TROCA (de uma cidade para outra), não ao carregamento inicial.
  const prevCityRef = useRef<number | null>(location.cityId);
  useEffect(() => {
    const prev = prevCityRef.current;
    prevCityRef.current = location.cityId;
    if (prev != null && location.cityId !== prev && filters.cityIds != null) {
      writeUrl({ ...filters, cityIds: null });
    }
    // só a troca de cidade importa aqui
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.cityId]);

  const toSearchAdsBody = useCallback(
    (seed: number, page = 0): SearchAdsBody => ({
      p_state: filters.state || null,
      // primeira cidade da lista = a "selecionada" (o resto são as irmãs/extras)
      p_city_id: effectiveCityIds[0] ? Number(effectiveCityIds[0]) : null,
      p_city_ibge: effectiveCityIds[0] ?? null,
      // lista explícita sempre que há cidade: o proxy (`withRegionCities`) não a sobrescreve, então
      // tirar uma irmã no filtro realmente a tira do resultado.
      ...(effectiveCityIds.length ? { p_city_ibges: effectiveCityIds } : {}),
      p_group_category_slug: filters.groupSlug,
      p_category_id: filters.categoryIds.length === 1 ? filters.categoryIds[0] : null,
      p_category_ids: filters.categoryIds.length > 1 ? filters.categoryIds : null,
      p_subcategories: filters.subcategoryIds.length ? filters.subcategoryIds : null,
      p_query: filters.query?.trim() || null,
      p_seed: seed,
      p_page: page,
      p_page_size: PAGE_SIZE,
      p_exclude_category_slugs:
        filters.categoryIds.length === 0 && excludeCategorySlugs.length
          ? excludeCategorySlugs
          : null,
    }),
    [filters, effectiveCityIds, excludeCategorySlugs]
  );

  return {
    filters,
    setFilters,
    resetFilters,
    applyAgentFilter,
    toSearchAdsBody,
    defaultCityIds,
    effectiveCityIds,
  };
}
