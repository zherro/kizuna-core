import { beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetIpRegionCache, lookupIpRegion } from './ip-geo';

const IP = '187.12.45.9';

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
}

beforeEach(() => __resetIpRegionCache());

describe('lookupIpRegion', () => {
  it('usa os headers da Vercel sem chamar fetch', async () => {
    const fetchImpl = vi.fn();
    const headers = new Headers({
      'x-vercel-ip-city': 'Cuiab%C3%A1',
      'x-vercel-ip-country-region': 'MT',
      'x-vercel-ip-country': 'BR',
    });
    const out = await lookupIpRegion(IP, headers, { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(out).toEqual({ city: 'Cuiabá', uf: 'MT' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('usa os headers da Cloudflare sem chamar fetch', async () => {
    const fetchImpl = vi.fn();
    const headers = new Headers({ 'cf-ipcity': 'Várzea Grande', 'cf-region-code': 'MT', 'cf-ipcountry': 'BR' });
    const out = await lookupIpRegion(IP, headers, { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(out).toEqual({ city: 'Várzea Grande', uf: 'MT' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('header de país fora do Brasil → null', async () => {
    const fetchImpl = vi.fn();
    const headers = new Headers({
      'x-vercel-ip-city': 'Austin',
      'x-vercel-ip-country-region': 'TX',
      'x-vercel-ip-country': 'US',
    });
    expect(await lookupIpRegion(IP, headers, { fetchImpl: fetchImpl as unknown as typeof fetch })).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('header de plataforma sem país → null (sem chamar fetch)', async () => {
    const fetchImpl = vi.fn();
    const opts = { fetchImpl: fetchImpl as unknown as typeof fetch };
    expect(
      await lookupIpRegion(IP, new Headers({ 'x-vercel-ip-city': 'Cuiab%C3%A1', 'x-vercel-ip-country-region': 'MT' }), opts)
    ).toBeNull();
    expect(await lookupIpRegion(IP, new Headers({ 'cf-ipcity': 'Cuiabá', 'cf-region-code': 'MT' }), opts)).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('circuit breaker: 429 do ip-api pausa as consultas até X-Ttl', async () => {
    let t = 5_000_000;
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 429, headers: { 'X-Rl': '0', 'X-Ttl': '30' } }))
      .mockResolvedValue(jsonResponse({ status: 'success', countryCode: 'BR', region: 'MT', city: 'Cuiabá' }));
    const opts = { fetchImpl: fetchImpl as unknown as typeof fetch, now: () => t };
    expect(await lookupIpRegion(IP, new Headers(), opts)).toBeNull();
    t += 29_000;
    expect(await lookupIpRegion('187.12.45.10', new Headers(), opts)).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    t += 2_000;
    expect(await lookupIpRegion('187.12.45.10', new Headers(), opts)).toEqual({ city: 'Cuiabá', uf: 'MT' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('circuit breaker: X-Rl 0 usa a resposta atual e pausa as próximas (X-Ttl padrão 60 s)', async () => {
    let t = 9_000_000;
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ status: 'success', countryCode: 'BR', region: 'MT', city: 'Cuiabá' }), {
        headers: { 'X-Rl': '0' },
      })
    );
    const opts = { fetchImpl: fetchImpl as unknown as typeof fetch, now: () => t };
    expect(await lookupIpRegion(IP, new Headers(), opts)).toEqual({ city: 'Cuiabá', uf: 'MT' });
    t += 59_000;
    expect(await lookupIpRegion('187.12.45.11', new Headers(), opts)).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    t += 2_000;
    await lookupIpRegion('187.12.45.11', new Headers(), opts);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('consultas simultâneas do mesmo IP compartilham uma chamada', async () => {
    let release!: (r: Response) => void;
    const fetchImpl = vi.fn(() => new Promise<Response>((resolve) => (release = resolve)));
    const opts = { fetchImpl: fetchImpl as unknown as typeof fetch };
    const a = lookupIpRegion(IP, new Headers(), opts);
    const b = lookupIpRegion(IP, new Headers(), opts);
    await Promise.resolve();
    release(jsonResponse({ status: 'success', countryCode: 'BR', region: 'MT', city: 'Cuiabá' }));
    expect(await a).toEqual({ city: 'Cuiabá', uf: 'MT' });
    expect(await b).toEqual({ city: 'Cuiabá', uf: 'MT' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('chamada em andamento que falha é descartada (a próxima consulta tenta de novo)', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValue(jsonResponse({ status: 'success', countryCode: 'BR', region: 'MT', city: 'Cuiabá' }));
    const opts = { fetchImpl: fetchImpl as unknown as typeof fetch };
    expect(await lookupIpRegion(IP, new Headers(), opts)).toBeNull();
    expect(await lookupIpRegion(IP, new Headers(), opts)).toEqual({ city: 'Cuiabá', uf: 'MT' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('sem headers consulta o ip-api (HTTP, com timeout) e guarda em cache por IP', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ status: 'success', countryCode: 'BR', region: 'MT', city: 'Cuiabá' })
    );
    const opts = { fetchImpl: fetchImpl as unknown as typeof fetch };
    expect(await lookupIpRegion(IP, new Headers(), opts)).toEqual({ city: 'Cuiabá', uf: 'MT' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/^http:\/\/ip-api\.com\/json\/187\.12\.45\.9\?fields=/);
    expect(init.signal).toBeInstanceOf(AbortSignal);

    expect(await lookupIpRegion(IP, new Headers(), opts)).toEqual({ city: 'Cuiabá', uf: 'MT' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('cache expira depois de 10 minutos', async () => {
    let t = 1_000_000;
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ status: 'success', countryCode: 'BR', region: 'MT', city: 'Cuiabá' })
    );
    const opts = { fetchImpl: fetchImpl as unknown as typeof fetch, now: () => t };
    await lookupIpRegion(IP, new Headers(), opts);
    t += 10 * 60_000 + 1;
    await lookupIpRegion(IP, new Headers(), opts);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("status 'fail' → null", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ status: 'fail', message: 'reserved range' }));
    expect(
      await lookupIpRegion(IP, new Headers(), { fetchImpl: fetchImpl as unknown as typeof fetch })
    ).toBeNull();
  });

  it('erro de rede → null', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    expect(
      await lookupIpRegion(IP, new Headers(), { fetchImpl: fetchImpl as unknown as typeof fetch })
    ).toBeNull();
  });

  it('timeout → null', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    });
    expect(
      await lookupIpRegion(IP, new Headers(), { fetchImpl: fetchImpl as unknown as typeof fetch })
    ).toBeNull();
  });

  it('região fora do Brasil → null', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ status: 'success', countryCode: 'US', region: 'TX', city: 'Austin' })
    );
    expect(
      await lookupIpRegion(IP, new Headers(), { fetchImpl: fetchImpl as unknown as typeof fetch })
    ).toBeNull();
  });

  it('IP privado sem headers → null sem chamar fetch', async () => {
    const fetchImpl = vi.fn();
    expect(
      await lookupIpRegion('10.0.0.1', new Headers(), { fetchImpl: fetchImpl as unknown as typeof fetch })
    ).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('cache limitado a 5000 entradas (descarta a mais antiga)', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ status: 'success', countryCode: 'BR', region: 'MT', city: 'Cuiabá' })
    );
    const opts = { fetchImpl: fetchImpl as unknown as typeof fetch };
    for (let i = 0; i < 5001; i++) {
      await lookupIpRegion(`187.12.${Math.floor(i / 250)}.${(i % 250) + 1}`, new Headers(), opts);
    }
    expect(fetchImpl).toHaveBeenCalledTimes(5001);
    // a primeira saiu do cache; a última continua
    await lookupIpRegion('187.12.0.1', new Headers(), opts);
    expect(fetchImpl).toHaveBeenCalledTimes(5002);
    await lookupIpRegion(`187.12.20.1`, new Headers(), opts);
    expect(fetchImpl).toHaveBeenCalledTimes(5002);
  });
});
