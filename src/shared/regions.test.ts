import { describe, expect, it } from 'vitest';
import { parseRegions, regionCitiesFor, regionGroupsFor, withRegionCities } from './regions';

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

  it('Cuiabá: a vizinha (VG) é fundida, não sugerida — só Chapada vira seção', () => {
    expect(regionGroupsFor(regions, 5103403)).toEqual([
      { key: 'chapada', title: 'Para o fim de semana', cities: ['5103007'] },
    ]);
  });

  it('VG sugere só Chapada (Cuiabá já vem junto)', () => {
    expect(regionGroupsFor(regions, '5108402').map((g) => g.cities)).toEqual([['5103007']]);
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

  describe('withRegionCities (body da fn_search_services)', () => {
    const map = withRegionCities(regions);

    it('cidade com irmãs → p_city_ibges com a selecionada primeiro', () => {
      expect(map({ p_city_ibge: '5108402', p_page: 0 })).toEqual({
        p_city_ibge: '5108402',
        p_page: 0,
        p_city_ibges: ['5108402', '5103403'],
      });
    });

    it('cidade sozinha, fora de região ou sem cidade → body intacto', () => {
      expect(map({ p_city_ibge: '5103007' })).toEqual({ p_city_ibge: '5103007' });
      expect(map({ p_city_ibge: '9999999' })).toEqual({ p_city_ibge: '9999999' });
      expect(map({ p_city_ibge: null })).toEqual({ p_city_ibge: null });
    });

    it('não sobrescreve p_city_ibges já informado', () => {
      expect(map({ p_city_ibge: '5103403', p_city_ibges: ['5103403'] })).toEqual({
        p_city_ibge: '5103403',
        p_city_ibges: ['5103403'],
      });
    });
  });
});
