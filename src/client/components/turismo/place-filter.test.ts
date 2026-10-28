import { describe, expect, it } from 'vitest';
import { buildFilterOptions, filterPlaces, hasActiveFilters, NO_FILTERS } from './place-filter';
import { dificuldadeInfo, paradasLabel } from './turismo-labels';

const items = [
  { id: 1, tipo: 'dormir', faixaPreco: '$', regiao: 'sucuri' },
  { id: 2, tipo: 'dormir', faixaPreco: '$$$', regiao: 'bom-sucesso' },
  { id: 3, tipo: 'comer', faixaPreco: '$$', regiao: null },
  { id: 4, tipo: 'atracao', faixaPreco: null, regiao: 'sucuri' },
];

describe('filterPlaces', () => {
  it('sem filtro devolve tudo', () => {
    expect(filterPlaces(items, NO_FILTERS)).toHaveLength(4);
    expect(hasActiveFilters(NO_FILTERS)).toBe(false);
  });
  it('combina tipo, faixa e região', () => {
    expect(filterPlaces(items, { ...NO_FILTERS, tipo: 'dormir' }).map((i) => i.id)).toEqual([1, 2]);
    expect(filterPlaces(items, { tipo: 'dormir', faixa: '$$$', regiao: null }).map((i) => i.id)).toEqual([2]);
    expect(filterPlaces(items, { tipo: null, faixa: null, regiao: 'sucuri' }).map((i) => i.id)).toEqual([1, 4]);
    expect(filterPlaces(items, { tipo: 'comer', faixa: '$', regiao: null })).toEqual([]);
  });
});

describe('buildFilterOptions', () => {
  it('lista só o que existe, em ordem fixa, com contagem e título da região', () => {
    const o = buildFilterOptions(items, [{ slug: 'sucuri', title: 'Sucuri' }]);
    expect(o.tipos.map((t) => [t.value, t.count])).toEqual([['dormir', 2], ['comer', 1], ['atracao', 1]]);
    expect(o.faixas.map((f) => f.value)).toEqual(['$', '$$', '$$$']);
    expect(o.regioes.map((r) => r.label)).toEqual(['Bom Sucesso', 'Sucuri']);
  });
  it('dimensão com menos de 2 opções some', () => {
    const o = buildFilterOptions([{ tipo: 'comer', faixaPreco: '$$' }, { tipo: 'comer', faixaPreco: '$$' }]);
    expect(o).toEqual({ tipos: [], faixas: [], regioes: [] });
  });
});

describe('rótulos', () => {
  it('dificuldade e paradas', () => {
    expect(dificuldadeInfo('moderado')).toEqual({ label: 'Moderado', level: 2 });
    expect(dificuldadeInfo('x')).toBeNull();
    expect(paradasLabel(1)).toBe('1 parada');
    expect(paradasLabel(4)).toBe('4 paradas');
  });
});
