// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isExcludedPath,
  normalizePagePath,
  PAGE_VIEW_URL,
  resolvePageCity,
  sendPageView,
  whenIdle,
} from './page-view';
import { __resetUtmMemo, getSessionUtm, UTM_STORAGE_KEY } from './utm-session';

const BROWSER = { webdriver: false, userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36' };
const beacon = vi.fn();
const fetchMock = vi.fn();

function setUrl(path: string) {
  window.history.replaceState(null, '', path);
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  __resetUtmMemo();
  setUrl('/');
  document.cookie = 'kz_city=; max-age=0; path=/';
  beacon.mockReset().mockReturnValue(true);
  fetchMock.mockReset().mockResolvedValue(new Response('{}'));
  vi.stubGlobal('navigator', { ...BROWSER, sendBeacon: beacon });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

async function beaconBody(call = 0): Promise<Record<string, unknown>> {
  const blob = beacon.mock.calls[call]![1] as Blob;
  return JSON.parse(await blob.text());
}

describe('normalizePagePath / isExcludedPath', () => {
  it('só o caminho, sem query/hash nem barra final, no máx. 200', () => {
    expect(normalizePagePath('/cuiaba-mt/hoje/?token=abc#x')).toBe('/cuiaba-mt/hoje');
    expect(normalizePagePath('//busca//')).toBe('/busca');
    expect(normalizePagePath('/')).toBe('/');
    expect(normalizePagePath('sem-barra')).toBeNull();
    expect(normalizePagePath(`/${'a'.repeat(300)}`)).toHaveLength(200);
  });

  it('painel e api ficam de fora (prefixo de segmento inteiro)', () => {
    expect(isExcludedPath('/painel')).toBe(true);
    expect(isExcludedPath('/painel/metricas')).toBe(true);
    expect(isExcludedPath('/api/x')).toBe(true);
    expect(isExcludedPath('/painelista')).toBe(false);
  });
});

describe('resolvePageCity', () => {
  it('slug de cidade na rota vence; senão cookie kz_city; reservado/inválido = null', () => {
    expect(resolvePageCity('/cuiaba-mt/anuncio/1', 'kz_city=varzea-grande-mt')).toBe('cuiaba-mt');
    expect(resolvePageCity('/busca', 'a=1; kz_city=varzea-grande-mt')).toBe('varzea-grande-mt');
    expect(resolvePageCity('/busca', 'kz_city=<script>')).toBeNull();
    expect(resolvePageCity('/', '')).toBeNull();
  });
});

describe('sendPageView', () => {
  it('manda por sendBeacon: caminho, hash do dia, aparelho, cidade e utm da sessão', async () => {
    setUrl('/cuiaba-mt?utm_source=IG&utm_campaign=Agenda%20Quinta');
    expect(sendPageView('/cuiaba-mt')).toBe(true);
    expect(beacon).toHaveBeenCalledTimes(1);
    expect(beacon.mock.calls[0]![0]).toBe(PAGE_VIEW_URL);
    const body = await beaconBody();
    expect(body).toEqual({
      p_path: '/cuiaba-mt',
      p_visitor_hash: expect.stringMatching(/^[0-9a-f]{32}$/),
      p_device: 'mobile',
      p_city: 'cuiaba-mt',
      p_utm_source: 'instagram',
      p_utm_campaign: 'agenda_quinta',
    });
    expect(JSON.stringify(body)).not.toContain(BROWSER.userAgent);
  });

  it('utm guardado na chegada vai junto nas páginas seguintes (URL já sem utm)', async () => {
    setUrl('/?utm_source=zap');
    getSessionUtm();
    setUrl('/busca');
    sendPageView('/busca');
    expect((await beaconBody()).p_utm_source).toBe('whatsapp');
    expect(JSON.parse(sessionStorage.getItem(UTM_STORAGE_KEY)!)).toEqual({ source: 'whatsapp' });
  });

  it('uma vez por caminho na sessão; painel e robô não enviam', () => {
    expect(sendPageView('/hoje')).toBe(true);
    expect(sendPageView('/hoje/')).toBe(false);
    expect(sendPageView('/painel/metricas')).toBe(false);
    vi.stubGlobal('navigator', { webdriver: false, userAgent: 'Googlebot/2.1', sendBeacon: beacon });
    expect(sendPageView('/mapa')).toBe(false);
    expect(beacon).toHaveBeenCalledTimes(1);
  });

  it('sem sendBeacon cai no fetch keepalive', () => {
    vi.stubGlobal('navigator', { ...BROWSER });
    sendPageView('/turismo');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(PAGE_VIEW_URL);
    expect(init).toMatchObject({ method: 'POST', keepalive: true });
  });
});

describe('whenIdle', () => {
  it('espera o load e o ocioso; cancelar antes não roda', () => {
    vi.useFakeTimers();
    try {
      const fn = vi.fn();
      Object.defineProperty(document, 'readyState', { value: 'loading', configurable: true });
      whenIdle(fn);
      vi.advanceTimersByTime(5000);
      expect(fn).not.toHaveBeenCalled();
      window.dispatchEvent(new Event('load'));
      vi.advanceTimersByTime(5000);
      expect(fn).toHaveBeenCalledTimes(1);

      const other = vi.fn();
      Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true });
      const cancel = whenIdle(other);
      cancel();
      vi.advanceTimersByTime(5000);
      expect(other).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
