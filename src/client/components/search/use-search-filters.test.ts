import { describe, expect, it } from 'vitest';
import { countActiveFilters, shouldHideCategoryCarousel } from './use-search-filters';
import type { SearchFilters } from './search-types';

const base: SearchFilters = {
  state: 'PR',
  cityId: null,
  cityName: null,
  groupSlug: null,
  categoryId: null,
  subcategoryIds: [],
  query: null,
  priceMin: null,
  priceMax: null,
  sort: 'relevance',
};

describe('countActiveFilters', () => {
  it('sem filtro = 0; localização e ordenação não contam', () => {
    expect(countActiveFilters(base)).toBe(0);
    expect(countActiveFilters({ ...base, cityId: 1, cityName: 'X', sort: 'price' })).toBe(0);
  });

  it('conta grupo, categoria, cada especialidade, texto e a faixa de preço (uma vez)', () => {
    expect(
      countActiveFilters({
        ...base,
        groupSlug: 'eventos',
        categoryId: 3,
        subcategoryIds: [1, 2],
        query: 'dj',
        priceMin: 10,
        priceMax: 50,
      })
    ).toBe(6);
    expect(countActiveFilters({ ...base, priceMax: 50 })).toBe(1);
  });
});

describe('shouldHideCategoryCarousel', () => {
  it('sem categoria o carrossel fica', () => {
    expect(shouldHideCategoryCarousel(base)).toBe(false);
    expect(shouldHideCategoryCarousel({ ...base, query: 'dj', priceMin: 5 })).toBe(false);
  });

  it('só a categoria: o carrossel continua (a pessoa ainda navega entre categorias)', () => {
    expect(shouldHideCategoryCarousel({ ...base, categoryId: 3 })).toBe(false);
    expect(shouldHideCategoryCarousel({ ...base, categoryId: 3, groupSlug: 'eventos' })).toBe(false);
  });

  it('categoria + mais um filtro: some', () => {
    expect(shouldHideCategoryCarousel({ ...base, categoryId: 3, subcategoryIds: [7] })).toBe(true);
    expect(shouldHideCategoryCarousel({ ...base, categoryId: 3, query: 'dj' })).toBe(true);
    expect(shouldHideCategoryCarousel({ ...base, categoryId: 3, priceMax: 100 })).toBe(true);
  });
});
