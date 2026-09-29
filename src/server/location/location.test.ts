import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  listLocationCities,
  parseLocationConfig,
  resolveLocation,
  type LocationConfig,
} from './index';

const PROMPT: LocationConfig = { outsideList: 'prompt', defaultCityIbge: null };
const DEFAULT: LocationConfig = { outsideList: 'default', defaultCityIbge: '5103403' };

const MT = { code: 'MT', name: 'Mato Grosso' };
const MS = { code: 'MS', name: 'Mato Grosso do Sul' };
const CUIABA = { id: 5103403, name: 'Cuiabá', location_state: MT };
const VG = { id: 5108402, name: 'Várzea Grande', location_state: MT };
const CG = { id: 5002704, name: 'Campo Grande', location_state: MS };

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

const urls = (fn: ReturnType<typeof stubFetch>) => fn.mock.calls.map(([u]) => String(u));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('parseLocationConfig', () => {
  it('sem bloco → prompt, sem cidade padrão', () => {
    expect(parseLocationConfig(undefined)).toEqual(PROMPT);
  });

  it('lê outsideList e defaultCityIbge', () => {
    expect(parseLocationConfig({ outsideList: 'default', defaultCityIbge: 5103403 })).toEqual(
      DEFAULT
    );
  });

  it('valor inválido quebra com erro claro', () => {
    expect(() => parseLocationConfig({ outsideList: 'x' })).toThrow(/location\.outsideList/);
    expect(() => parseLocationConfig({ outsideList: 'default', defaultCityIbge: '12' })).toThrow(
      /7 dígitos/
    );
  });

  it('outsideList default exige defaultCityIbge', () => {
    expect(() => parseLocationConfig({ outsideList: 'default' })).toThrow(/defaultCityIbge/);
  });
});

describe('listLocationCities', () => {
  it('lista só cidades com search_city, com a UF, por nome', async () => {
    const fetchMock = stubFetch({ '/location_city?': [CG, CUIABA, VG] });
    expect(await listLocationCities()).toEqual([
      { value: '5002704', label: 'Campo Grande', stateCode: 'MS', stateName: 'Mato Grosso do Sul' },
      { value: '5103403', label: 'Cuiabá', stateCode: 'MT', stateName: 'Mato Grosso' },
      { value: '5108402', label: 'Várzea Grande', stateCode: 'MT', stateName: 'Mato Grosso' },
    ]);
    const [url] = urls(fetchMock);
    expect(url).toContain('search_city=is.true');
    expect(url).toContain('order=name');
    expect(url).not.toContain('ibge.gov.br');
  });

  it('com UF filtra pelo estado', async () => {
    const fetchMock = stubFetch({ '/location_city?': [CUIABA, VG] });
    await listLocationCities('mt');
    expect(urls(fetchMock)[0]).toContain('location_state.code=eq.MT');
  });
});

describe('resolveLocation', () => {
  it('cidade marcada, ignorando acento e caixa', async () => {
    const fetchMock = stubFetch({ '/location_city?': [CUIABA, VG] });
    expect(await resolveLocation(PROMPT, { uf: 'MT', city: 'cuiaba' })).toEqual({
      stateCode: 'MT',
      stateName: 'Mato Grosso',
      cityId: 5103403,
      cityName: 'Cuiabá',
    });
    expect(urls(fetchMock)[0]).toContain('search_city=is.true');
  });

  it('fora da lista + prompt → null', async () => {
    stubFetch({ '/location_city?': [] });
    expect(await resolveLocation(PROMPT, { uf: 'SP', city: 'São Paulo' })).toBeNull();
  });

  it('fora da lista + default → cidade padrão (também precisa estar marcada)', async () => {
    const fetchMock = stubFetch({ 'id=eq.5103403': [CUIABA], '/location_city?': [] });
    expect((await resolveLocation(DEFAULT, { uf: 'SP', city: 'São Paulo' }))?.cityId).toBe(5103403);
    const fallbackUrl = urls(fetchMock).find((u) => u.includes('id=eq.5103403'))!;
    expect(fallbackUrl).toContain('search_city=is.true');
  });

  it('sem UF (IP indisponível/estrangeiro) + default → cidade padrão', async () => {
    stubFetch({ 'id=eq.5103403': [CUIABA] });
    expect((await resolveLocation(DEFAULT, {}))?.cityId).toBe(5103403);
  });

  it('sem UF + prompt → null, sem consultar o banco', async () => {
    const fetchMock = stubFetch({});
    expect(await resolveLocation(PROMPT, {})).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('cidade padrão desmarcada/ausente → null', async () => {
    stubFetch({ '/location_city?': [] });
    expect(await resolveLocation(DEFAULT, { uf: 'SP', city: 'São Paulo' })).toBeNull();
  });
});
