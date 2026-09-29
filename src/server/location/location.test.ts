import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetLocationCache,
  listLocationCities,
  listLocationStates,
  parseLocationConfig,
  resolveLocation,
  type LocationConfig,
} from './index';

const DB: LocationConfig = {
  source: 'db',
  outsideList: 'prompt',
  defaultCityIbge: null,
};
const DB_DEFAULT: LocationConfig = {
  source: 'db',
  outsideList: 'default',
  defaultCityIbge: '5103403',
};
const IBGE: LocationConfig = {
  source: 'ibge',
  outsideList: 'prompt',
  defaultCityIbge: null,
};

const MT = { code: 'MT', name: 'Mato Grosso' };
const DB_CITIES = [
  { id: 5103403, name: 'Cuiabá', location_state: MT },
  { id: 5108402, name: 'Várzea Grande', location_state: MT },
];

type Route = (url: string) => unknown;

/** Stub de fetch: a primeira rota cujo trecho aparece na URL responde (JSON, 200). */
function stubFetch(routes: Record<string, Route | unknown>) {
  const fn = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    for (const [needle, reply] of Object.entries(routes)) {
      if (url.includes(needle)) {
        const body = typeof reply === 'function' ? (reply as Route)(url) : reply;
        return new Response(JSON.stringify(body), { status: 200 });
      }
    }
    return new Response('[]', { status: 404 });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

beforeEach(() => {
  __resetLocationCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('parseLocationConfig', () => {
  it('sem bloco → ibge / prompt (comportamento antigo)', () => {
    expect(parseLocationConfig(undefined)).toEqual({
      source: 'ibge',
      outsideList: 'prompt',
      defaultCityIbge: null,
    });
  });

  it('lê source, outsideList e defaultCityIbge', () => {
    expect(
      parseLocationConfig({
        source: 'db',
        outsideList: 'default',
        defaultCityIbge: 5103403,
      })
    ).toEqual(DB_DEFAULT);
  });

  it('valor inválido quebra com erro claro', () => {
    expect(() => parseLocationConfig({ source: 'mapa' })).toThrow(/location\.source/);
    expect(() => parseLocationConfig({ outsideList: 'x' })).toThrow(/location\.outsideList/);
  });

  it('outsideList default exige defaultCityIbge', () => {
    expect(() => parseLocationConfig({ source: 'db', outsideList: 'default' })).toThrow(
      /defaultCityIbge/
    );
  });
});

describe('modo db', () => {
  it('lista estados da tabela location_state', async () => {
    const fetchMock = stubFetch({
      '/location_state?': [
        { id: 50, code: 'MS', name: 'Mato Grosso do Sul' },
        { id: 51, code: 'MT', name: 'Mato Grosso' },
      ],
    });
    expect(await listLocationStates(DB)).toEqual([
      { id: 50, sigla: 'MS', nome: 'Mato Grosso do Sul' },
      { id: 51, sigla: 'MT', nome: 'Mato Grosso' },
    ]);
    expect(String(fetchMock.mock.calls[0]![0])).not.toContain('ibge.gov.br');
  });

  it('lista cidades da UF pedida', async () => {
    const fetchMock = stubFetch({ '/location_city?': DB_CITIES });
    expect(await listLocationCities(DB, 'mt')).toEqual([
      { value: '5103403', label: 'Cuiabá' },
      { value: '5108402', label: 'Várzea Grande' },
    ]);
    expect(String(fetchMock.mock.calls[0]![0])).toContain('location_state.code=eq.MT');
  });

  it('resolve cidade da lista ignorando acento e caixa', async () => {
    stubFetch({ '/location_city?': DB_CITIES });
    expect(await resolveLocation(DB, { uf: 'MT', city: 'cuiaba' })).toEqual({
      stateCode: 'MT',
      stateName: 'Mato Grosso',
      cityId: 5103403,
      cityName: 'Cuiabá',
    });
  });

  it('cidade fora da lista + prompt → null', async () => {
    stubFetch({ '/location_city?': [] });
    expect(await resolveLocation(DB, { uf: 'SP', city: 'São Paulo' })).toBeNull();
  });

  it('cidade fora da lista + default → cidade padrão', async () => {
    stubFetch({
      'id=eq.5103403': [DB_CITIES[0]],
      '/location_city?': [],
    });
    expect(await resolveLocation(DB_DEFAULT, { uf: 'SP', city: 'São Paulo' })).toEqual({
      stateCode: 'MT',
      stateName: 'Mato Grosso',
      cityId: 5103403,
      cityName: 'Cuiabá',
    });
  });

  it('sem UF (ex.: IP estrangeiro) + default → cidade padrão', async () => {
    stubFetch({ 'id=eq.5103403': [DB_CITIES[0]] });
    expect((await resolveLocation(DB_DEFAULT, {}))?.cityId).toBe(5103403);
  });

  it('default configurado mas ausente do banco → null', async () => {
    stubFetch({ '/location_city?': [] });
    expect(await resolveLocation(DB_DEFAULT, { uf: 'SP', city: 'São Paulo' })).toBeNull();
  });
});

describe('modo ibge', () => {
  const IBGE_ROUTES = {
    '/localidades/estados/MT/municipios': [
      { id: 5103403, nome: 'Cuiabá' },
      { id: 5108402, nome: 'Várzea Grande' },
    ],
    '/localidades/estados?': [
      { id: 51, sigla: 'MT', nome: 'Mato Grosso' },
      { id: 35, sigla: 'SP', nome: 'São Paulo' },
    ],
  };

  it('lista estados e cidades do IBGE', async () => {
    stubFetch(IBGE_ROUTES);
    expect(await listLocationStates(IBGE)).toEqual([
      { id: 51, sigla: 'MT', nome: 'Mato Grosso' },
      { id: 35, sigla: 'SP', nome: 'São Paulo' },
    ]);
    expect(await listLocationCities(IBGE, 'MT')).toHaveLength(2);
  });

  it('resolve acha o código IBGE pelo nome', async () => {
    stubFetch(IBGE_ROUTES);
    expect(await resolveLocation(IBGE, { uf: 'MT', city: 'Várzea Grande' })).toEqual({
      stateCode: 'MT',
      stateName: 'Mato Grosso',
      cityId: 5108402,
      cityName: 'Várzea Grande',
    });
  });

  it('cidade não encontrada mantém a detectada com id 0 (sem restrição)', async () => {
    stubFetch(IBGE_ROUTES);
    expect(await resolveLocation(IBGE, { uf: 'MT', city: 'Lugar Nenhum' })).toEqual({
      stateCode: 'MT',
      stateName: 'Mato Grosso',
      cityId: 0,
      cityName: 'Lugar Nenhum',
    });
  });

  it('sem UF → null', async () => {
    stubFetch(IBGE_ROUTES);
    expect(await resolveLocation(IBGE, {})).toBeNull();
  });
});
