'use client';

import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

/** Quantos filtros estão ativos (grupo, categoria, cada especialidade, texto, faixa de preço). */
export function countActiveFilters(f: SearchFilters): number {
  return (
    (f.groupSlug ? 1 : 0) +
    (f.categoryId ? 1 : 0) +
    f.subcategoryIds.length +
    (f.query ? 1 : 0) +
    (f.priceMin != null || f.priceMax != null ? 1 : 0)
  );
}

/**
 * O carrossel de categorias só some quando há categoria E mais algum filtro (especialidade, texto ou
 * preço). Só com a categoria ele continua — quem está navegando ainda quer ver as outras.
 */
export function shouldHideCategoryCarousel(f: SearchFilters): boolean {
  if (!f.categoryId) return false;
  return f.subcategoryIds.length > 0 || Boolean(f.query) || f.priceMin != null || f.priceMax != null;
}

/**
 * Fonte única do estado de filtro da /busca, sincronizada com a URL (que é a fonte de verdade —
 * busca compartilhável). Escrita tanto pelo painel de filtro manual quanto pelo resultado da IA.
 */
export function useSearchFilters(location: Location, basePath = '/busca') {
  const router = useRouter();
  const params = useSearchParams();

  const filters = useMemo<SearchFilters>(() => {
    const sortParam = params.get('sort');
    return {
      state: params.get('state')?.trim() || location.state,
      cityId: parseIntOrNull(params.get('cityId')) ?? location.cityId,
      cityName: params.get('cityName') || location.cityName,
      groupSlug: params.get('group') || null,
      categoryId: parseIntOrNull(params.get('categoryId')),
      subcategoryIds: parseIdList(params.get('subcategoryIds')),
      query: params.get('q')?.trim() || null,
      priceMin: parseIntOrNull(params.get('priceMin')),
      priceMax: parseIntOrNull(params.get('priceMax')),
      sort: (sortParam === 'price' || sortParam === 'rating'
        ? sortParam
        : 'relevance') as SearchSort,
    };
    // location entra só como fallback; params é o gatilho real de recomputo
  }, [params, location.state, location.cityId, location.cityName]);

  const writeUrl = useCallback(
    (next: SearchFilters) => {
      const sp = new URLSearchParams();
      if (next.state) sp.set('state', next.state);
      if (next.cityId) sp.set('cityId', String(next.cityId));
      if (next.cityName) sp.set('cityName', next.cityName);
      if (next.groupSlug) sp.set('group', next.groupSlug);
      if (next.categoryId) sp.set('categoryId', String(next.categoryId));
      if (next.subcategoryIds.length) sp.set('subcategoryIds', next.subcategoryIds.join(','));
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
        patch.categoryId !== undefined &&
        patch.categoryId !== filters.categoryId &&
        patch.subcategoryIds === undefined
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
      categoryId: null,
      subcategoryIds: [],
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
      if (f.categoryId !== undefined) patch.categoryId = f.categoryId ?? null;
      if (f.subcategoryIds !== undefined) patch.subcategoryIds = f.subcategoryIds ?? [];
      if (f.query !== undefined) patch.query = f.query ?? null;
      if (f.priceMin !== undefined) patch.priceMin = f.priceMin ?? null;
      if (f.priceMax !== undefined) patch.priceMax = f.priceMax ?? null;
      if (Object.keys(patch).length > 0) setFilters(patch);
    },
    [setFilters]
  );

  const toSearchAdsBody = useCallback(
    (seed: number, page = 0): SearchAdsBody => ({
      p_state: filters.state || null,
      p_city_id: filters.cityId,
      // `cityId` já é o código IBGE (vem de `user_location.cityId` / `?cityId=`) — manda como
      // filtro exato de cidade do prestador.
      p_city_ibge: filters.cityId ? String(filters.cityId) : null,
      p_group_category_slug: filters.groupSlug,
      p_category_id: filters.categoryId,
      p_subcategories: filters.subcategoryIds.length ? filters.subcategoryIds : null,
      p_query: filters.query?.trim() || null,
      p_seed: seed,
      p_page: page,
      p_page_size: PAGE_SIZE,
    }),
    [filters]
  );

  return { filters, setFilters, resetFilters, applyAgentFilter, toSearchAdsBody };
}
