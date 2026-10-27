import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../service-db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../service-db')>();
  return { ...actual, serviceRpc: vi.fn() };
});
vi.mock('./ip-geo', () => ({ lookupIpRegion: vi.fn() }));
vi.mock('../ai/rate-limit', () => ({ checkRateLimit: vi.fn() }));

import { checkRateLimit } from '../ai/rate-limit';
import { decryptValue, generateAppEncryptionKey, hmacValue } from '../app-crypto';
import { serviceRpc, ServiceUnavailableError } from '../service-db';
import { parseAnalyticsConfig } from '../../shared/analytics/config';
import { lookupIpRegion } from './ip-geo';
import { __resetAnalyticsTrackState, createAnalyticsTrackHandler } from './track-handler';

const rpc = vi.mocked(serviceRpc);
const geo = vi.mocked(lookupIpRegion);
const limit = vi.mocked(checkRateLimit);

const ENV_KEYS = ['APP_ENCRYPTION_KEY', 'PGRST_JWT_SECRET', 'JWT_SECRET', 'TRUSTED_PROXY_HOPS'] as const;
const saved: Record<string, string | undefined> = {};

const ENTITY_ID = '6f1c1d2e-3a4b-4c5d-8e9f-0a1b2c3d4e5f';
const VIEWER_ID = '11111111-2222-4333-8444-555555555555';
const IP = '187.12.45.9';

const baseBody = {
  p_entity_type: 'service',
  p_entity_id: ENTITY_ID,
  p_event_type: 'view',
  p_visitor_hash: 'abcdef0123456789',
  p_source: 'search',
  p_visible_ms: 1600,
  p_device: 'mobile',
};

function req(
  body: unknown,
  headers: Record<string, string> = { 'x-forwarded-for': IP },
  contentType = 'application/json'
) {
  return new Request('http://localhost/api/analytics/track', {
    method: 'POST',
    headers: { 'content-type': contentType, ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function rpcArgs(): Record<string, unknown> {
  expect(rpc).toHaveBeenCalledTimes(1);
  expect(rpc.mock.calls[0][0]).toBe('fn_analytics_track_ctx');
  return rpc.mock.calls[0][1] as Record<string, unknown>;
}

function cfg(collect: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) {
  return parseAnalyticsConfig({ collect, ...extra });
}

beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  process.env.APP_ENCRYPTION_KEY = generateAppEncryptionKey();
  delete process.env.TRUSTED_PROXY_HOPS;
  __resetAnalyticsTrackState();
  limit.mockReset();
  limit.mockReturnValue(true);
  rpc.mockReset();
  rpc.mockResolvedValue(new Response('true', { status: 200 }));
  geo.mockReset();
  geo.mockResolvedValue({ city: 'Cuiabá', uf: 'MT' });
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('createAnalyticsTrackHandler', () => {
  it('caminho feliz: envia device, região, IP mascarado, chave e IP cifrado', async () => {
    const handler = createAnalyticsTrackHandler({ config: cfg(), getViewerId: async () => VIEWER_ID });
    const res = await handler(req(baseBody));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ tracked: true });

    const a = rpcArgs();
    expect(a).toMatchObject({
      p_entity_type: 'service',
      p_entity_id: ENTITY_ID,
      p_event_type: 'view',
      p_visitor_hash: 'abcdef0123456789',
      p_source: 'search',
      p_visible_ms: 1600,
      p_device: 'mobile',
      p_region_city: 'Cuiabá',
      p_region_uf: 'MT',
      p_ip_masked: '187.12.45.•',
      p_ip_key: hmacValue('analytics-ip', IP),
      p_viewer_id: VIEWER_ID,
    });
    expect(a.p_ip).not.toBe(IP);
    expect(decryptValue('analytics-ip', String(a.p_ip))).toBe(IP);
    expect(geo).toHaveBeenCalledWith(IP, expect.any(Headers));
  });

  it('envia os 13 parâmetros da função (opcionais como null)', async () => {
    const handler = createAnalyticsTrackHandler({ config: cfg({ ip: false, region: false, device: false }) });
    await handler(req(baseBody));
    expect(Object.keys(rpcArgs()).sort()).toEqual(
      [
        'p_entity_type', 'p_entity_id', 'p_event_type', 'p_visitor_hash', 'p_source', 'p_visible_ms',
        'p_device', 'p_region_city', 'p_region_uf', 'p_ip_masked', 'p_ip_key', 'p_ip', 'p_viewer_id',
      ].sort()
    );
  });

  it('aceita beacon como text/plain', async () => {
    const handler = createAnalyticsTrackHandler({ config: cfg() });
    const res = await handler(req(baseBody, { 'x-forwarded-for': IP }, 'text/plain;charset=UTF-8'));
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('encryptIp: false envia o IP em claro', async () => {
    const handler = createAnalyticsTrackHandler({ config: cfg({ encryptIp: false }) });
    await handler(req(baseBody));
    const a = rpcArgs();
    expect(a.p_ip).toBe(IP);
    expect(a.p_ip_key).toBe(hmacValue('analytics-ip', IP));
  });

  it("x-forwarded-for 'spoof, 187.12.45.9' com 1 proxy confiável (padrão) usa o último salto", async () => {
    const handler = createAnalyticsTrackHandler({ config: cfg({ encryptIp: false }) });
    await handler(req(baseBody, { 'x-forwarded-for': `spoof, ${IP}` }));
    const a = rpcArgs();
    expect(a.p_ip).toBe(IP);
    expect(a.p_ip_masked).toBe('187.12.45.•');
  });

  it('não escolhe o salto da esquerda forjado pelo cliente', async () => {
    const handler = createAnalyticsTrackHandler({ config: cfg({ encryptIp: false }) });
    await handler(req(baseBody, { 'x-forwarded-for': `8.8.8.8, ${IP}` }));
    expect(rpcArgs().p_ip).toBe(IP);
  });

  it("TRUSTED_PROXY_HOPS=2 com 'spoof, 187.12.45.9' → salto inválido, sem IP nem região (não procura outro)", async () => {
    process.env.TRUSTED_PROXY_HOPS = '2';
    const handler = createAnalyticsTrackHandler({ config: cfg({ encryptIp: false }) });
    await handler(req(baseBody, { 'x-forwarded-for': `spoof, ${IP}` }));
    expect(rpcArgs()).toMatchObject({
      p_ip: null, p_ip_key: null, p_ip_masked: null, p_region_city: null, p_region_uf: null,
    });
    expect(geo).not.toHaveBeenCalled();
  });

  it('TRUSTED_PROXY_HOPS=2 com 3 saltos usa o penúltimo', async () => {
    process.env.TRUSTED_PROXY_HOPS = '2';
    const handler = createAnalyticsTrackHandler({ config: cfg({ encryptIp: false }) });
    await handler(req(baseBody, { 'x-forwarded-for': `1.1.1.1, ${IP}, 10.0.0.5` }));
    expect(rpcArgs().p_ip).toBe(IP);
  });

  it('header com um único salto (Vercel/Cloudflare sobrescrevem) usa esse salto', async () => {
    process.env.TRUSTED_PROXY_HOPS = '3';
    const handler = createAnalyticsTrackHandler({ config: cfg({ encryptIp: false }) });
    await handler(req(baseBody, { 'x-forwarded-for': IP }));
    expect(rpcArgs().p_ip).toBe(IP);
  });

  it('TRUSTED_PROXY_HOPS inválido cai em 1', async () => {
    for (const bad of ['0', '-2', 'abc', '1.5']) {
      rpc.mockClear();
      process.env.TRUSTED_PROXY_HOPS = bad;
      const handler = createAnalyticsTrackHandler({ config: cfg({ encryptIp: false }) });
      await handler(req(baseBody, { 'x-forwarded-for': `spoof, ${IP}` }));
      expect(rpcArgs().p_ip, bad).toBe(IP);
    }
  });

  it('x-real-ip só quando não há x-forwarded-for', async () => {
    const handler = createAnalyticsTrackHandler({ config: cfg({ encryptIp: false }) });
    await handler(req(baseBody, { 'x-real-ip': IP }));
    expect(rpcArgs().p_ip).toBe(IP);
    rpc.mockClear();
    await handler(req(baseBody, { 'x-forwarded-for': '10.0.0.1', 'x-real-ip': IP }));
    expect(rpcArgs().p_ip).toBeNull();
  });

  it('último salto lixo: sem campos de IP e região', async () => {
    const handler = createAnalyticsTrackHandler({ config: cfg() });
    await handler(req(baseBody, { 'x-forwarded-for': `${IP}, nada` }));
    const a = rpcArgs();
    expect(a).toMatchObject({
      p_ip: null, p_ip_key: null, p_ip_masked: null, p_region_city: null, p_region_uf: null,
    });
    expect(a.p_device).toBe('mobile');
  });

  it('IP privado: sem campos de IP e região', async () => {
    const handler = createAnalyticsTrackHandler({ config: cfg() });
    await handler(req(baseBody, { 'x-forwarded-for': '192.168.0.10' }));
    expect(rpcArgs()).toMatchObject({
      p_ip: null, p_ip_key: null, p_ip_masked: null, p_region_city: null, p_region_uf: null,
    });
  });

  it('sem chave nem segredos e encryptIp: true → sem IP algum, 200', async () => {
    for (const k of ENV_KEYS) delete process.env[k];
    const handler = createAnalyticsTrackHandler({ config: cfg() });
    const res = await handler(req(baseBody));
    expect(res.status).toBe(200);
    const a = rpcArgs();
    expect(a.p_ip).toBeNull();
    expect(a.p_ip_key).toBeNull();
    expect(a.p_ip_masked).toBeNull();
    expect(JSON.stringify(a)).not.toContain(IP);
    expect(a.p_region_uf).toBe('MT');
  });

  it('chave inválida e encryptIp: true → nunca grava o IP em claro', async () => {
    process.env.APP_ENCRYPTION_KEY = 'curta';
    const handler = createAnalyticsTrackHandler({ config: cfg() });
    const res = await handler(req(baseBody));
    expect(res.status).toBe(200);
    expect(JSON.stringify(rpcArgs())).not.toContain(IP);
  });

  it('collect.ip: false → nenhum campo de IP (região continua)', async () => {
    const handler = createAnalyticsTrackHandler({ config: cfg({ ip: false }) });
    await handler(req(baseBody));
    const a = rpcArgs();
    expect(a).toMatchObject({ p_ip: null, p_ip_key: null, p_ip_masked: null, p_region_uf: 'MT' });
  });

  it('collect.region: false → não consulta a região', async () => {
    const handler = createAnalyticsTrackHandler({ config: cfg({ region: false }) });
    await handler(req(baseBody));
    expect(geo).not.toHaveBeenCalled();
    expect(rpcArgs()).toMatchObject({ p_region_city: null, p_region_uf: null });
  });

  it('collect.device: false ignora p_device', async () => {
    const handler = createAnalyticsTrackHandler({ config: cfg({ device: false }) });
    await handler(req(baseBody));
    expect(rpcArgs().p_device).toBeNull();
  });

  it("p_device: 'tv' → grava o evento com device NULL", async () => {
    const handler = createAnalyticsTrackHandler({ config: cfg() });
    const res = await handler(req({ ...baseBody, p_device: 'tv' }));
    expect(res.status).toBe(200);
    expect(rpcArgs().p_device).toBeNull();
  });

  it('p_event_type desconhecido → 400', async () => {
    const handler = createAnalyticsTrackHandler({ config: cfg() });
    const res = await handler(req({ ...baseBody, p_event_type: 'hack' }));
    expect(res.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('campos principais inválidos → 400', async () => {
    const handler = createAnalyticsTrackHandler({ config: cfg() });
    for (const bad of [
      { p_entity_id: 'x' },
      { p_visitor_hash: 'XYZ' },
      { p_source: 'lixo' },
      { p_visible_ms: -1 },
      { p_visible_ms: 100 }, // view exige >= 500
      { p_visible_ms: 1.5 },
      { p_entity_type: '' },
    ]) {
      const res = await handler(req({ ...baseBody, ...bad }));
      expect(res.status, JSON.stringify(bad)).toBe(400);
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  it('JSON inválido → 400; corpo grande → 413; content-type não JSON → 415', async () => {
    const handler = createAnalyticsTrackHandler({ config: cfg() });
    expect((await handler(req('{nao json'))).status).toBe(400);
    expect((await handler(req('[1,2]'))).status).toBe(400);
    expect((await handler(req({ ...baseBody, pad: 'x'.repeat(5000) }))).status).toBe(413);
    expect(
      (await handler(req('a=b', { 'x-forwarded-for': IP }, 'application/x-www-form-urlencoded'))).status
    ).toBe(415);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('campos desconhecidos são ignorados', async () => {
    const handler = createAnalyticsTrackHandler({ config: cfg() });
    const res = await handler(req({ ...baseBody, p_ip: '1.1.1.1', p_viewer_id: VIEWER_ID, foo: 1 }));
    expect(res.status).toBe(200);
    const a = rpcArgs();
    expect(a.foo).toBeUndefined();
    expect(a.p_viewer_id).toBeNull();
    expect(decryptValue('analytics-ip', String(a.p_ip))).toBe(IP);
  });

  it('analytics desligado → 204 sem gravar', async () => {
    const handler = createAnalyticsTrackHandler({ config: cfg({}, { enabled: false }) });
    const res = await handler(req(baseBody));
    expect(res.status).toBe(204);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('evento fora da lista configurada → 204 sem gravar', async () => {
    const handler = createAnalyticsTrackHandler({ config: cfg({}, { events: { impression: {} } }) });
    const res = await handler(req(baseBody));
    expect(res.status).toBe(204);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('serviceRpc lançando ServiceUnavailableError → 200 { tracked: false }', async () => {
    rpc.mockRejectedValue(new ServiceUnavailableError());
    const handler = createAnalyticsTrackHandler({ config: cfg() });
    const res = await handler(req(baseBody));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ tracked: false });
  });

  it('sem token de serviço: avisa uma vez só, sem IP', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rpc.mockRejectedValue(new ServiceUnavailableError());
    const handler = createAnalyticsTrackHandler({ config: cfg() });
    for (let i = 0; i < 3; i++) {
      const res = await handler(req(baseBody));
      expect(await res.json()).toEqual({ tracked: false });
    }
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('POSTGREST_SERVICE_TOKEN');
    expect(JSON.stringify(warn.mock.calls)).not.toContain(IP);
    warn.mockRestore();
  });

  it('RPC 404 (migração 0003 ausente): avisa uma vez só', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rpc.mockImplementation(async () => new Response('{}', { status: 404 }));
    const handler = createAnalyticsTrackHandler({ config: cfg() });
    for (let i = 0; i < 3; i++) {
      const res = await handler(req(baseBody));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ tracked: false });
    }
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('0003');
    warn.mockRestore();
  });

  it('erro do RPC não vaza para o cliente', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    rpc.mockResolvedValue(
      new Response(JSON.stringify({ message: 'analytics_events: valor inválido', details: IP }), { status: 400 })
    );
    const handler = createAnalyticsTrackHandler({ config: cfg() });
    const res = await handler(req(baseBody));
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(JSON.parse(text)).toEqual({ tracked: false });
    expect(text).not.toContain(IP);
    for (const call of spy.mock.calls) expect(JSON.stringify(call)).not.toContain(IP);
    spy.mockRestore();
  });

  it('lookupIpRegion lançando → grava sem região', async () => {
    geo.mockRejectedValue(new Error('boom'));
    const handler = createAnalyticsTrackHandler({ config: cfg() });
    const res = await handler(req(baseBody));
    expect(res.status).toBe(200);
    const a = rpcArgs();
    expect(a).toMatchObject({ p_region_city: null, p_region_uf: null, p_device: 'mobile' });
    expect(a.p_ip_masked).toBe('187.12.45.•');
  });

  it('rate limit por IP (120/60 s) antes de ler o corpo: 429 sem corpo útil', async () => {
    limit.mockReturnValue(false);
    const handler = createAnalyticsTrackHandler({ config: cfg() });
    const res = await handler(req('{nao json'));
    expect(res.status).toBe(429);
    expect(limit).toHaveBeenCalledWith(`analytics:${IP}`, 120, 60_000);
    expect(rpc).not.toHaveBeenCalled();
    expect(geo).not.toHaveBeenCalled();
    expect(await res.text()).not.toContain(IP);
  });

  it('rate limit sem IP identificável usa a chave unknown', async () => {
    const handler = createAnalyticsTrackHandler({ config: cfg() });
    await handler(req(baseBody, { 'x-forwarded-for': 'lixo' }));
    expect(limit).toHaveBeenCalledWith('analytics:unknown', 120, 60_000);
  });

  it('ip_key_unavailable é logado no máximo uma vez por processo', async () => {
    for (const k of ENV_KEYS) delete process.env[k];
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const handler = createAnalyticsTrackHandler({ config: cfg() });
    await handler(req(baseBody));
    await handler(req(baseBody));
    await handler(req(baseBody));
    const hits = warn.mock.calls.filter((c) => String(c[0]).includes('ip_key_unavailable'));
    expect(hits).toHaveLength(1);
    warn.mockRestore();
  });

  it('getViewerId falhando ou inválido → p_viewer_id null', async () => {
    const h1 = createAnalyticsTrackHandler({
      config: cfg(),
      getViewerId: async () => {
        throw new Error('sem sessão');
      },
    });
    expect((await h1(req(baseBody))).status).toBe(200);
    expect(rpcArgs().p_viewer_id).toBeNull();
    rpc.mockClear();
    const h2 = createAnalyticsTrackHandler({ config: cfg(), getViewerId: async () => 'nao-uuid' });
    await h2(req(baseBody));
    expect(rpcArgs().p_viewer_id).toBeNull();
  });
});
