import { describe, expect, it } from 'vitest';
import { filterCreatable, unknownCreatableSlugs } from './creatable';

const groups = [
  { id: 'g1', slug: 'eventos' },
  { id: 'g2', slug: 'hospedagem' },
  { id: 'g3', slug: 'saude' },
];
const categories = [
  { id: 'c1', slug: 'shows', categoryGroupId: 'g1' },
  { id: 'c2', slug: 'festas', categoryGroupId: 'g1' },
  { id: 'c3', slug: 'hoteis-e-pousadas', categoryGroupId: 'g2' },
  { id: 'c4', slug: 'day-use', categoryGroupId: 'g2' },
  { id: 'c5', slug: 'clinica', categoryGroupId: 'g3' },
  { id: 'c6', slug: 'extra', categoryGroupId: 'g3', extraGroupIds: ['g1'] },
];

const ids = (list: { id: unknown }[]) => list.map((i) => String(i.id));

describe('filterCreatable', () => {
  it('sem config devolve tudo', () => {
    const out = filterCreatable({ groups, categories });
    expect(out.groups).toBe(groups);
    expect(out.categories).toBe(categories);
  });

  it('grupo liberado traz só as categorias do grupo principal (extras não abrem a criação)', () => {
    const out = filterCreatable({ groups, categories, creatable: { groups: ['eventos'] } });
    expect(ids(out.groups)).toEqual(['g1']);
    expect(ids(out.categories)).toEqual(['c1', 'c2']);
  });

  it('categoria liberada mostra só ela e o grupo dela', () => {
    const out = filterCreatable({
      groups,
      categories,
      creatable: { categories: ['hoteis-e-pousadas'] },
    });
    expect(ids(out.groups)).toEqual(['g2']);
    expect(ids(out.categories)).toEqual(['c3']);
  });

  it('combina grupos e categorias', () => {
    const out = filterCreatable({
      groups,
      categories,
      creatable: { groups: ['eventos'], categories: ['hoteis-e-pousadas'] },
    });
    expect(ids(out.groups)).toEqual(['g1', 'g2']);
    expect(ids(out.categories)).toEqual(['c1', 'c2', 'c3']);
  });

  it('root vê tudo', () => {
    const out = filterCreatable({
      groups,
      categories,
      creatable: { groups: ['eventos'] },
      bypass: true,
    });
    expect(out.groups).toBe(groups);
    expect(out.categories).toBe(categories);
  });

  it('em edição preserva o grupo e a categoria atuais', () => {
    const out = filterCreatable({
      groups,
      categories,
      creatable: { groups: ['eventos'] },
      keep: { groupId: 'g3', categoryId: 'c5' },
    });
    expect(ids(out.groups)).toEqual(['g1', 'g3']);
    expect(ids(out.categories)).toEqual(['c1', 'c2', 'c5']);
  });

  it('lista vazia não libera nada', () => {
    const out = filterCreatable({ groups, categories, creatable: { groups: [], categories: [] } });
    expect(out.groups).toEqual([]);
    expect(out.categories).toEqual([]);
  });
});

describe('unknownCreatableSlugs', () => {
  it('lista slugs que não existem na taxonomia', () => {
    expect(
      unknownCreatableSlugs({
        groups,
        categories,
        creatable: { groups: ['eventos', 'nope'], categories: ['shows', 'ghost'] },
      })
    ).toEqual({ groups: ['nope'], categories: ['ghost'] });
  });
});
