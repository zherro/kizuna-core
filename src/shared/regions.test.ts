import { describe, expect, it } from 'vitest';
import { parseRegions, regionCitiesFor, regionGroupsFor } from './regions';

const regions = parseRegions([
  { key: 'grande-cuiaba', title: 'Também na Grande Cuiabá', cities: ['5103403', 5108402] },
  {
    key: 'chapada',
    title: 'Para o fim de semana',
    cities: ['5103007'],
    suggestTo: ['grande-cuiaba'],
  },
  { key: 'invalida' },
]);

describe('regions', () => {
  it('ignora região sem cidades e normaliza IBGE para string', () => {
    expect(regions.map((r) => r.key)).toEqual(['grande-cuiaba', 'chapada']);
    expect(regions[0].cities).toEqual(['5103403', '5108402']);
  });

  it('Cuiabá: vizinha (VG) primeiro, depois Chapada como sugestão', () => {
    expect(regionGroupsFor(regions, 5103403)).toEqual([
      { key: 'grande-cuiaba', title: 'Também na Grande Cuiabá', cities: ['5108402'] },
      { key: 'chapada', title: 'Para o fim de semana', cities: ['5103007'] },
    ]);
  });

  it('VG sugere Cuiabá e Chapada', () => {
    expect(regionGroupsFor(regions, '5108402').map((g) => g.cities)).toEqual([
      ['5103403'],
      ['5103007'],
    ]);
  });

  it('Chapada sozinha não sugere nada (ninguém configurado para ela)', () => {
    expect(regionGroupsFor(regions, '5103007')).toEqual([]);
  });

  it('cidade fora de região ou vazia → nada', () => {
    expect(regionGroupsFor(regions, '9999999')).toEqual([]);
    expect(regionGroupsFor(regions, null)).toEqual([]);
  });

  it('regionCitiesFor: cidade selecionada primeiro + vizinhas', () => {
    expect(regionCitiesFor(regions, '5108402')).toEqual(['5108402', '5103403']);
    expect(regionCitiesFor(regions, '9999999')).toEqual(['9999999']);
  });
});
