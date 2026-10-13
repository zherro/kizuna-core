import { describe, expect, it } from 'vitest';
import {
  buildFilterTaxonomy,
  categoriesOfGroup,
  groupChangePatch,
  groupsWithCategories,
  resolveListings,
  resolveActiveGroup,
  selectedFirst,
  subcategoryBlocks,
  summarizeActiveFilters,
  toggleCategory,
  toggleSubcategory,
  type CategoryRow,
  type GroupRow,
  type StatRow,
} from './filter-taxonomy';

const GROUPS: GroupRow[] = [
  { id: 2, name: 'Serviços', slug: 'servicos', icon: 'Wrench', sortOrder: 2, active: true },
  { id: 1, name: 'Eventos', slug: 'eventos', icon: 'PartyPopper', sortOrder: 1, active: true },
  { id: 3, name: 'Inativo', slug: 'inativo', sortOrder: 0, active: false },
  { id: 4, name: 'Vazio', slug: 'vazio', sortOrder: 3, active: true },
];

// 10 Shows (grupo 1, extra no 2) · 11 Teatro (grupo 1) · 20 Eletricista (grupo 2)
// 30 Sem grupo · 40 Sem subcategoria (não aparece) · 50 Inativa
const CATEGORIES: CategoryRow[] = [
  { id: 10, name: 'Shows', icon: 'Music', categoryGroupId: 1, extraGroupIds: [2], active: true },
  { id: 11, name: 'Teatro', categoryGroupId: 1, extraGroupIds: [], active: true },
  { id: 20, name: 'Eletricista', categoryGroupId: 2, extraGroupIds: [], active: true },
  { id: 50, name: 'Inativa', categoryGroupId: 1, active: false },
];

const STATS: StatRow[] = [
  { id: 101, categoryId: 10, categoryName: 'Shows', categoryIcon: 'Mic', categoryGroupId: 1, subcategoryId: 101, subcategoryName: 'Sertanejo' },
  { id: 102, categoryId: 10, categoryName: 'Shows', categoryGroupId: 1, subcategoryId: 102, subcategoryName: 'Rock' },
  { id: 111, categoryId: 11, categoryName: 'Teatro', categoryGroupId: 1, subcategoryId: 111, subcategoryName: 'Comédia' },
  { id: 201, categoryId: 20, categoryName: 'Eletricista', categoryGroupId: 2, subcategoryId: 201, subcategoryName: 'Residencial' },
  { id: 301, categoryId: 30, categoryName: 'Sem grupo', categoryGroupId: null, subcategoryId: 301, subcategoryName: 'Qualquer' },
  { id: 501, categoryId: 50, categoryName: 'Inativa', categoryGroupId: 1, subcategoryId: 501, subcategoryName: 'X' },
  // linha repetida (dedupe) e linha sem nome de subcategoria (ignorada)
  { id: 101, categoryId: 10, categoryName: 'Shows', categoryGroupId: 1, subcategoryId: 101, subcategoryName: 'Sertanejo' },
  { id: 999, categoryId: 40, categoryName: 'Sem sub', categoryGroupId: 1, subcategoryId: null, subcategoryName: null },
];

const t = buildFilterTaxonomy({ groups: GROUPS, categories: CATEGORIES, stats: STATS });

describe('buildFilterTaxonomy', () => {
  it('ordena grupos por sortOrder e descarta inativos', () => {
    expect(t.groups.map((g) => g.slug)).toEqual(['eventos', 'servicos', 'vazio']);
  });

  it('só lista categorias com subcategoria ativa e não-inativas', () => {
    const names = t.categories.map((c) => c.name);
    expect(names).toEqual(['Eletricista', 'Sem grupo', 'Shows', 'Teatro']);
    expect(names).not.toContain('Sem sub');
    expect(names).not.toContain('Inativa');
  });

  it('dedupe subcategorias e ordena por nome', () => {
    const shows = t.categories.find((c) => c.id === 10)!;
    expect(shows.subs.map((s) => s.name)).toEqual(['Rock', 'Sertanejo']);
  });

  it('ícone e vínculos extras vêm de categories_public; ícone cai pro da view', () => {
    const shows = t.categories.find((c) => c.id === 10)!;
    expect(shows.icon).toBe('Music');
    expect(shows.extraGroupIds).toEqual([2]);
    const teatro = t.categories.find((c) => c.id === 11)!;
    expect(teatro.icon).toBeNull();
  });

  it('sem categories_public ainda funciona com o grupo primário da view', () => {
    const only = buildFilterTaxonomy({ groups: GROUPS, categories: [], stats: STATS });
    const shows = only.categories.find((c) => c.id === 10)!;
    expect(shows.groupId).toBe(1);
    expect(shows.icon).toBe('Mic');
    expect(shows.extraGroupIds).toEqual([]);
  });

  it('aceita ids como string (PostgREST bigint)', () => {
    const s = buildFilterTaxonomy({
      groups: [{ id: '1', name: 'A', slug: 'a' }],
      stats: [{ categoryId: '5', categoryName: 'C', categoryGroupId: '1', subcategoryId: '9', subcategoryName: 'S' }],
    });
    expect(s.groups[0].id).toBe(1);
    expect(s.categories[0]).toMatchObject({ id: 5, groupId: 1 });
    expect(s.categories[0].subs).toEqual([{ id: 9, name: 'S' }]);
  });
});

describe('buildFilterTaxonomy · só com anúncio (listings)', () => {
  const build = (extra: Parameters<typeof buildFilterTaxonomy>[0]) =>
    buildFilterTaxonomy({ groups: GROUPS, categories: CATEGORIES, stats: STATS, ...extra });

  it('com listings, descarta categoria sem anúncio publicado', () => {
    const r = build({
      listings: [
        { categoryId: 10, servicesCount: 3 },
        { categoryId: 11, servicesCount: 0 },
      ],
    });
    expect(r.categories.map((c) => c.id)).toEqual([10]);
  });

  it('grupo sem categoria com anúncio some do painel', () => {
    const r = build({ listings: [{ categoryId: 20, servicesCount: 1 }] });
    expect(groupsWithCategories(r).map((g) => g.slug)).toEqual(['servicos']);
  });

  it('categoria com anúncio aparece também no grupo extra', () => {
    const r = build({ listings: [{ categoryId: 10, servicesCount: 2 }] });
    expect(categoriesOfGroup(r, 1).map((c) => c.id)).toEqual([10]);
    expect(categoriesOfGroup(r, 2).map((c) => c.id)).toEqual([10]);
    expect(groupsWithCategories(r).map((g) => g.slug)).toEqual(['eventos', 'servicos']);
  });

  it('listings null (flag desligada ou fonte falhou) não filtra', () => {
    expect(build({ listings: null })).toEqual(t);
    expect(build({}).categories).toEqual(t.categories);
  });

  it('listings vazio filtra tudo (tenant sem anúncios)', () => {
    const r = build({ listings: [] });
    expect(r.categories).toEqual([]);
    expect(groupsWithCategories(r)).toEqual([]);
  });

  it('aceita ids e contagens como string (PostgREST bigint)', () => {
    const r = build({ listings: [{ categoryId: '11', servicesCount: '4' }] });
    expect(r.categories.map((c) => c.id)).toEqual([11]);
  });

  it('keepCategoryIds mantém a categoria marcada na URL mesmo sem anúncio', () => {
    const r = build({ listings: [{ categoryId: 20, servicesCount: 1 }], keepCategoryIds: [11] });
    expect(r.categories.map((c) => c.id)).toEqual([20, 11]);
    expect(categoriesOfGroup(r, 1).map((c) => c.id)).toEqual([11]);
  });

  it('keepCategoryIds não ressuscita categoria inativa', () => {
    const r = build({ listings: [], keepCategoryIds: [50] });
    expect(r.categories).toEqual([]);
  });
});

describe('buildFilterTaxonomy · subcategorias e grupos da view', () => {
  const build = (listings: Parameters<typeof buildFilterTaxonomy>[0]['listings']) =>
    buildFilterTaxonomy({ groups: GROUPS, categories: CATEGORIES, stats: STATS, listings });

  it('esconde subcategoria sem anúncio vivo', () => {
    const r = build([{ categoryId: 10, servicesCount: 3, subcategoryIds: [102] }]);
    expect(r.categories.find((c) => c.id === 10)?.subs.map((s) => s.name)).toEqual(['Rock']);
  });

  it('categoria com anúncio e sem subcategoria marcada continua listada, sem chips', () => {
    const r = build([{ categoryId: 11, servicesCount: 1, subcategoryIds: [] }]);
    const teatro = r.categories.find((c) => c.id === 11);
    expect(teatro).toBeDefined();
    expect(teatro?.subs).toEqual([]);
  });

  it('fonte sem subcategoryIds (view antiga) não filtra subcategorias', () => {
    const r = build([{ categoryId: 10, servicesCount: 3 }]);
    expect(r.categories.find((c) => c.id === 10)?.subs).toHaveLength(2);
  });

  it('sem categories_public, grupos vêm da view', () => {
    const r = buildFilterTaxonomy({
      groups: GROUPS,
      categories: null,
      stats: [{ ...STATS[0], categoryGroupId: null }],
      listings: [{ categoryId: 10, servicesCount: 1, categoryGroupId: 1, groupIds: [1, 2] }],
    });
    const c = r.categories[0];
    expect(c.groupId).toBe(1);
    expect(c.extraGroupIds).toEqual([2]);
  });
});

describe('resolveListings', () => {
  const rows = [{ categoryId: 10, servicesCount: 1 }];
  it('flag desligada → null', () => {
    expect(resolveListings({ enabled: false, rows })).toBeNull();
  });
  it('fonte com erro → null (não esvazia o filtro)', () => {
    expect(resolveListings({ enabled: true, rows: [], error: 'Erro de conexão' })).toBeNull();
    const r = buildFilterTaxonomy({
      groups: GROUPS,
      categories: CATEGORIES,
      stats: STATS,
      listings: resolveListings({ enabled: true, rows: [], error: 'x' }),
    });
    expect(r.categories).toEqual(t.categories);
  });
  it('flag ligada e fonte ok → as linhas', () => {
    expect(resolveListings({ enabled: true, rows })).toBe(rows);
  });
});

describe('categoriesOfGroup / groupsWithCategories', () => {
  it('inclui o grupo primário E as ligações extras', () => {
    expect(categoriesOfGroup(t, 1).map((c) => c.name)).toEqual(['Shows', 'Teatro']);
    expect(categoriesOfGroup(t, 2).map((c) => c.name)).toEqual(['Eletricista', 'Shows']);
  });

  it('esconde grupo sem categorias', () => {
    expect(groupsWithCategories(t).map((g) => g.slug)).toEqual(['eventos', 'servicos']);
  });
});

describe('resolveActiveGroup', () => {
  it('usa o groupSlug quando existe', () => {
    const r = resolveActiveGroup(t, { groupSlug: 'servicos', categoryIds: [10] });
    expect(r.group?.slug).toBe('servicos');
    expect(r.deduced).toBe(false);
  });

  it('sem grupo, deduz pelo grupo primário da primeira categoria marcada', () => {
    const r = resolveActiveGroup(t, { groupSlug: null, categoryIds: [20, 10] });
    expect(r.group?.slug).toBe('servicos');
    expect(r.deduced).toBe(true);
  });

  it('pula categoria sem grupo e usa a próxima', () => {
    const r = resolveActiveGroup(t, { groupSlug: null, categoryIds: [30, 11] });
    expect(r.group?.slug).toBe('eventos');
  });

  it('sem grupo e sem categoria → nenhum', () => {
    expect(resolveActiveGroup(t, { groupSlug: null, categoryIds: [] })).toEqual({
      group: null,
      deduced: false,
    });
  });

  it('categoria só ligada por vínculo extra usa o primeiro vínculo', () => {
    const only = buildFilterTaxonomy({
      groups: [{ id: 7, name: 'Lazer', slug: 'lazer' }],
      categories: [{ id: 5, name: 'Parques', categoryGroupId: null, extraGroupIds: [7] }],
      stats: [{ categoryId: 5, categoryName: 'Parques', subcategoryId: 50, subcategoryName: 'Trilha' }],
    });
    const r = resolveActiveGroup(only, { groupSlug: null, categoryIds: [5] });
    expect(r.group?.slug).toBe('lazer');
  });

  it('slug desconhecido cai na dedução', () => {
    const r = resolveActiveGroup(t, { groupSlug: 'nao-existe', categoryIds: [11] });
    expect(r.group?.slug).toBe('eventos');
  });
});

describe('selectedFirst / subcategoryBlocks', () => {
  it('sobe os marcados mantendo a ordem relativa', () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
    expect(selectedFirst(items, [4, 2]).map((i) => i.id)).toEqual([2, 4, 1, 3]);
  });

  it('um bloco por categoria marcada, com as marcadas primeiro', () => {
    const blocks = subcategoryBlocks(t, [10, 11], [102]);
    expect(blocks.map((b) => b.category.name)).toEqual(['Shows', 'Teatro']);
    expect(blocks[0].subs.map((s) => s.name)).toEqual(['Rock', 'Sertanejo']);
    const blocks2 = subcategoryBlocks(t, [10], [101]);
    expect(blocks2[0].subs.map((s) => s.name)).toEqual(['Sertanejo', 'Rock']);
  });

  it('categoria desconhecida não gera bloco', () => {
    expect(subcategoryBlocks(t, [999], [])).toEqual([]);
  });
});

describe('toggleCategory / toggleSubcategory / groupChangePatch', () => {
  it('marcar acrescenta e preserva as especialidades', () => {
    expect(toggleCategory(t, { categoryIds: [10], subcategoryIds: [101] }, 11)).toEqual({
      categoryIds: [10, 11],
      subcategoryIds: [101],
    });
  });

  it('desmarcar remove também as subcategorias daquela categoria', () => {
    expect(toggleCategory(t, { categoryIds: [10, 11], subcategoryIds: [101, 111] }, 10)).toEqual({
      categoryIds: [11],
      subcategoryIds: [111],
    });
  });

  it('toggleSubcategory alterna', () => {
    expect(toggleSubcategory([1], 2)).toEqual([1, 2]);
    expect(toggleSubcategory([1, 2], 1)).toEqual([2]);
  });

  it('trocar de grupo zera categorias e especialidades', () => {
    expect(groupChangePatch('eventos')).toEqual({
      groupSlug: 'eventos',
      categoryIds: [],
      subcategoryIds: [],
    });
    expect(groupChangePatch(null).groupSlug).toBeNull();
  });
});

describe('summarizeActiveFilters', () => {
  it('singular, plural e zero', () => {
    expect(summarizeActiveFilters(0)).toBe('Nenhum filtro aplicado');
    expect(summarizeActiveFilters(1)).toBe('1 filtro aplicado');
    expect(summarizeActiveFilters(3)).toBe('3 filtros aplicados');
  });
});
