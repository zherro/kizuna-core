import { describe, expect, it } from 'vitest';
import {
  countActiveFilters,
  isBrowseMode,
  parseCategoryIds,
  parseCityIds,
  serializeCityIds,
  shouldHideCategoryCarousel,
} from './use-search-filters';
import type { SearchFilters } from './search-types';

const base: SearchFilters = {
  state: 'PR',
  cityId: null,
  cityName: null,
  groupSlug: null,
  categoryIds: [],
  subcategoryIds: [],
  cityIds: null,
  query: null,
  priceMin: null,
  priceMax: null,
  sort: 'relevance',
};

describe('countActiveFilters', () => {
  it('sem filtro = 0; localização do cabeçalho e ordenação não contam', () => {
    expect(countActiveFilters(base)).toBe(0);
    expect(countActiveFilters({ ...base, cityId: 1, cityName: 'X', sort: 'price' })).toBe(0);
  });

  it('conta grupo, cada categoria, cada especialidade, cidades editadas, texto e preço (uma vez)', () => {
    expect(
      countActiveFilters({
        ...base,
        groupSlug: 'eventos',
        categoryIds: [3, 4],
        subcategoryIds: [1, 2],
        cityIds: ['5103403'],
        query: 'dj',
        priceMin: 10,
        priceMax: 50,
      })
    ).toBe(8);
    expect(countActiveFilters({ ...base, priceMax: 50 })).toBe(1);
  });

  it('"estado inteiro" (cidades vazias) conta como filtro de cidade editado', () => {
    expect(countActiveFilters({ ...base, cityIds: [] })).toBe(1);
  });
});

describe('isBrowseMode', () => {
  it('só cidade (do topo ou do filtro) = vitrine', () => {
    expect(isBrowseMode(base)).toBe(true);
    expect(isBrowseMode({ ...base, cityId: 1, cityName: 'X', cityIds: ['5103403'] })).toBe(true);
  });

  it('qualquer outro filtro, texto ou ordenação = lista', () => {
    expect(isBrowseMode({ ...base, groupSlug: 'eventos' })).toBe(false);
    expect(isBrowseMode({ ...base, categoryIds: [3] })).toBe(false);
    expect(isBrowseMode({ ...base, subcategoryIds: [9] })).toBe(false);
    expect(isBrowseMode({ ...base, query: 'show' })).toBe(false);
    expect(isBrowseMode({ ...base, priceMin: 10 })).toBe(false);
    expect(isBrowseMode({ ...base, sort: 'price' })).toBe(false);
  });
});

describe('shouldHideCategoryCarousel', () => {
  it('sem categoria o carrossel fica', () => {
    expect(shouldHideCategoryCarousel(base)).toBe(false);
    expect(shouldHideCategoryCarousel({ ...base, query: 'dj', priceMin: 5 })).toBe(false);
  });

  it('só a categoria: o carrossel continua (a pessoa ainda navega entre categorias)', () => {
    expect(shouldHideCategoryCarousel({ ...base, categoryIds: [3] })).toBe(false);
    expect(
      shouldHideCategoryCarousel({ ...base, categoryIds: [3, 4], groupSlug: 'eventos' })
    ).toBe(false);
  });

  it('categoria + mais um filtro: some', () => {
    expect(shouldHideCategoryCarousel({ ...base, categoryIds: [3], subcategoryIds: [7] })).toBe(
      true
    );
    expect(shouldHideCategoryCarousel({ ...base, categoryIds: [3], query: 'dj' })).toBe(true);
    expect(shouldHideCategoryCarousel({ ...base, categoryIds: [3], priceMax: 100 })).toBe(true);
  });
});

describe('parseCategoryIds', () => {
  it('lê ?categoryIds= (lista, sem repetidas nem lixo)', () => {
    expect(parseCategoryIds(new URLSearchParams('categoryIds=3,4,3,x,0'))).toEqual([3, 4]);
  });

  it('lê o ?categoryId= antigo (links do carrossel/home/sitemap)', () => {
    expect(parseCategoryIds(new URLSearchParams('categoryId=7'))).toEqual([7]);
  });

  it('categoryIds vence o legado; sem nada = []', () => {
    expect(parseCategoryIds(new URLSearchParams('categoryIds=1,2&categoryId=9'))).toEqual([1, 2]);
    expect(parseCategoryIds(new URLSearchParams(''))).toEqual([]);
  });
});

describe('cidades na URL (?cidades=)', () => {
  it('ausente = padrão (null); "estado" = nenhuma cidade ([])', () => {
    expect(parseCityIds(null)).toBeNull();
    expect(parseCityIds('')).toBeNull();
    expect(parseCityIds('estado')).toEqual([]);
  });

  it('lista de IBGE, sem repetidas e ignorando lixo', () => {
    expect(parseCityIds('5103403,5108402,5103403')).toEqual(['5103403', '5108402']);
    expect(parseCityIds('cuiaba,abc')).toBeNull();
  });

  it('serializa de volta (ida e volta)', () => {
    expect(serializeCityIds(null)).toBeNull();
    expect(serializeCityIds([])).toBe('estado');
    expect(serializeCityIds(['5103403', '5108402'])).toBe('5103403,5108402');
    expect(parseCityIds(serializeCityIds(['5103403']))).toEqual(['5103403']);
  });
});
