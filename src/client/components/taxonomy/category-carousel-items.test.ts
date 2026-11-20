import { describe, expect, it } from 'vitest';
import { buildCategoryItems, buildGroupItems } from './category-carousel-items';

const stats = [
  { id: 11, categoryId: 2, categoryName: 'Shows', categoryGroupId: 10, categoryIcon: 'music' },
  { id: 12, categoryId: 2, categoryName: 'Shows', categoryGroupId: 10, categoryIcon: 'music' },
  { id: 13, categoryId: 1, categoryName: 'Bares', categoryGroupId: 20 },
  { id: 14, categoryId: 3, categoryName: 'Cinema', categoryGroupId: 10 },
  { id: 15, categoryId: 0, categoryName: 'Inválida' },
];
const listings = [
  { id: 2, categoryId: 2, servicesCount: 4 },
  { id: 1, categoryId: 1, servicesCount: 0 },
  { id: 3, categoryId: 3, servicesCount: 1 },
];
const groups = [
  { id: 20, name: 'Comer e beber', slug: 'comer', sortOrder: 2 },
  { id: 10, name: 'Eventos', slug: 'eventos', icon: 'calendar', sortOrder: 1 },
  { id: 30, name: 'Inativo', slug: 'inativo', sortOrder: 0, active: false },
];

describe('buildCategoryItems', () => {
  it('um card por categoria, contando subcategorias, em ordem alfabética', () => {
    expect(buildCategoryItems(stats, [], false)).toEqual([
      { id: 1, name: 'Bares', icon: undefined, count: 1 },
      { id: 3, name: 'Cinema', icon: undefined, count: 1 },
      { id: 2, name: 'Shows', icon: 'music', count: 2 },
    ]);
  });

  it('com onlyWithListings, só as que têm anúncio', () => {
    expect(buildCategoryItems(stats, listings, true).map((c) => c.id)).toEqual([3, 2]);
  });
});

describe('buildGroupItems', () => {
  it('pelas facetas (inclui vínculo extra), grupos ativos em sortOrder', () => {
    const facets = [
      { id: 2, categoryId: 2, groupIds: [10] },
      { id: 3, categoryId: 3, groupIds: [10, 20] },
    ];
    const items = buildGroupItems({
      stats,
      groups,
      facets,
      facetsError: false,
      onlyWithListings: true,
      categoryItems: buildCategoryItems(stats, listings, true),
    });
    expect(items).toEqual([
      { id: 10, name: 'Eventos', slug: 'eventos', icon: 'calendar', count: 2 },
      { id: 20, name: 'Comer e beber', slug: 'comer', icon: null, count: 1 },
    ]);
  });

  it('sem facetas (erro), cai no grupo primário das categorias com anúncio', () => {
    const items = buildGroupItems({
      stats,
      groups,
      facets: [],
      facetsError: true,
      onlyWithListings: true,
      categoryItems: buildCategoryItems(stats, listings, true),
    });
    expect(items.map((g) => [g.slug, g.count])).toEqual([['eventos', 2]]);
  });

  it('sem onlyWithListings, usa o grupo primário de todas as categorias', () => {
    const items = buildGroupItems({
      stats,
      groups,
      facets: [],
      facetsError: false,
      onlyWithListings: false,
      categoryItems: [],
    });
    expect(items.map((g) => [g.slug, g.count])).toEqual([
      ['eventos', 2],
      ['comer', 1],
    ]);
  });
});
