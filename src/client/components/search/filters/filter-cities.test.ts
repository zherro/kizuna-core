// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetCitiesCache,
  cityLabel,
  loadCities,
  normalizeText,
  sameCitySet,
  searchCities,
  type CityOption,
} from './filter-cities';

const city = (value: string, label: string, stateCode = 'MT'): CityOption => ({
  value,
  label,
  stateCode,
  stateName: stateCode === 'MT' ? 'Mato Grosso' : 'Mato Grosso do Sul',
});

const CITIES = [
  city('1', 'Alta Floresta'),
  city('2', 'Cáceres'),
  city('3', 'Campo Grande', 'MS'),
  city('4', 'Cuiabá'),
  city('5', 'Várzea Grande'),
  city('6', 'Nova Várzea'),
  city('7', 'Sinop'),
  city('8', 'Sorriso'),
  city('9', 'Tangará da Serra'),
  city('10', 'Rondonópolis'),
];

describe('normalizeText', () => {
  it('tira acento e caixa', () => {
    expect(normalizeText('  VÁRZEA Grande ')).toBe('varzea grande');
  });
});

describe('searchCities', () => {
  it('sem busca devolve as primeiras N, menos as já escolhidas', () => {
    const r = searchCities(CITIES, '', ['1', '2'], 3);
    expect(r.map((c) => c.label)).toEqual(['Campo Grande', 'Cuiabá', 'Várzea Grande']);
  });

  it('ignora acento e caixa', () => {
    expect(searchCities(CITIES, 'CACERES').map((c) => c.value)).toEqual(['2']);
  });

  it('quem começa com o termo vem antes de quem só contém', () => {
    expect(searchCities(CITIES, 'varzea').map((c) => c.label)).toEqual([
      'Várzea Grande',
      'Nova Várzea',
    ]);
  });

  it('respeita o limite padrão de 8 e as exclusões', () => {
    expect(searchCities(CITIES, '')).toHaveLength(8);
    expect(searchCities(CITIES, 'cuiaba', ['4'])).toEqual([]);
  });
});

describe('sameCitySet / cityLabel', () => {
  it('compara como conjunto', () => {
    expect(sameCitySet(['1', '2'], ['2', '1'])).toBe(true);
    expect(sameCitySet(['1'], ['1', '2'])).toBe(false);
    expect(sameCitySet([], [])).toBe(true);
  });

  it('resolve o nome; sem catálogo cai num texto neutro', () => {
    expect(cityLabel(CITIES, '4')).toBe('Cuiabá');
    expect(cityLabel([], '4', true)).toBe('Carregando…');
    expect(cityLabel([], '4')).toBe('Cidade 4');
  });
});

describe('loadCities (cache em módulo)', () => {
  beforeEach(() => __resetCitiesCache());
  afterEach(() => vi.unstubAllGlobals());

  it('faz uma requisição só, mesmo com chamadas repetidas', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ items: CITIES }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);
    const [a, b] = await Promise.all([loadCities(), loadCities()]);
    await loadCities();
    expect(a).toHaveLength(10);
    expect(b).toBe(a);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falha não fica em cache', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: CITIES }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(loadCities()).rejects.toThrow();
    await expect(loadCities()).resolves.toHaveLength(10);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
