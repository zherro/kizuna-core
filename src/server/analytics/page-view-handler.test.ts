import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../service-db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../service-db')>();
  return { ...actual, serviceRpc: vi.fn() };
});
vi.mock('../ai/rate-limit', () => ({ checkRateLimit: vi.fn() }));

import { checkRateLimit } from '../ai/rate-limit';
import { serviceRpc, ServiceUnavailableError } from '../service-db';
import { parseAnalyticsConfig } from '../../shared/analytics/config';
import { __resetPageViewState, createAnalyticsPageViewHandler } from './page-view-handler';

const rpc = vi.mocked(serviceRpc);
const limit = vi.mocked(checkRateLimit);

const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const HASH = 'abcdef0123456789abcdef0123456789';

function req(body: unknown, headers: Record<string, string> = {}, contentType = 'text/plain;charset=UTF-8') {
  return new Request('http://localhost/api/analytics/page-view', {
    method: 'POST',
    headers: { 'content-type': contentType, 'user-agent': MOBILE_UA, 'x-forwarded-for': '187.12.45.9', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function args(): Record<string, unknown> {
  expect(rpc).toHaveBeenCalledTimes(1);
  expect(rpc.mock.calls[0]![0]).toBe('fn_analytics_page_view');
  return rpc.mock.calls[0]![1] as Record<string, unknown>;
}

beforeEach(() => {
  __resetPageViewState();
  limit.mockReset().mockReturnValue(true);
  rpc.mockReset().mockResolvedValue(new Response('true', { status: 200 }));
});

describe('createAnalyticsPageViewHandler', () => {
  it('caminho feliz (beacon text/plain): grava caminho, cidade, aparelho e utm renormalizado', async () => {
    const handler = createAnalyticsPageViewHandler();
    const res = await handler(
      req({
        p_path: '/cuiaba-mt/hoje?token=segredo',
        p_visitor_hash: HASH,
        p_city: 'cuiaba-mt',
        p_device: 'tablet',
        p_utm_source: 'IG',
        p_utm_medium: 'Social Media',
        p_utm_campaign: '<b>agenda</b>',
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ tracked: true });
    expect(args()).toEqual({
      p_path: '/cuiaba-mt/hoje',
      p_visitor_hash: HASH,
      p_city: 'cuiaba-mt',
      p_device: 'tablet',
      p_utm_source: 'instagram',
      p_utm_medium: 'social_media',
      p_utm_campaign: 'bagendab',
    });
  });

  it('cidade inválida vira null; aparelho ausente sai do user-agent; sem utm = null', async () => {
    const handler = createAnalyticsPageViewHandler();
    await handler(req({ p_path: '/', p_visitor_hash: HASH, p_city: 'painel' }));
    expect(args()).toMatchObject({ p_city: null, p_device: 'mobile', p_utm_source: null });
  });

  it('collect.device=false não grava aparelho', async () => {
    const handler = createAnalyticsPageViewHandler({ config: parseAnalyticsConfig({ collect: { device: false } }) });
    await handler(req({ p_path: '/busca', p_visitor_hash: HASH, p_device: 'mobile' }));
    expect(args().p_device).toBeNull();
  });

  it('painel e api → 204 sem banco', async () => {
    const handler = createAnalyticsPageViewHandler();
    expect((await handler(req({ p_path: '/painel/metricas', p_visitor_hash: HASH }))).status).toBe(204);
    expect((await handler(req({ p_path: '/api/x', p_visitor_hash: HASH }))).status).toBe(204);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('robô, analytics desligado → 204 sem banco', async () => {
    const handler = createAnalyticsPageViewHandler();
    const bot = await handler(req({ p_path: '/', p_visitor_hash: HASH }, { 'user-agent': 'Googlebot/2.1' }));
    expect(bot.status).toBe(204);
    const off = createAnalyticsPageViewHandler({ config: parseAnalyticsConfig({ enabled: false }) });
    expect((await off(req({ p_path: '/', p_visitor_hash: HASH }))).status).toBe(204);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('entrada inválida → 400; corpo grande → 413; content-type estranho → 415; limite → 429', async () => {
    const handler = createAnalyticsPageViewHandler();
    expect((await handler(req({ p_path: 'sem-barra', p_visitor_hash: HASH }))).status).toBe(400);
    expect((await handler(req({ p_path: '/', p_visitor_hash: 'XYZ' }))).status).toBe(400);
    expect((await handler(req('{nope'))).status).toBe(400);
    expect((await handler(req({ p_path: '/', p_visitor_hash: HASH, pad: 'x'.repeat(3000) }))).status).toBe(413);
    expect((await handler(req({ p_path: '/', p_visitor_hash: HASH }, {}, 'text/html'))).status).toBe(415);
    limit.mockReturnValue(false);
    expect((await handler(req({ p_path: '/', p_visitor_hash: HASH }))).status).toBe(429);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('banco sem a 0005 (404) ou sem token de serviço → 200 tracked:false', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const handler = createAnalyticsPageViewHandler();
      rpc.mockResolvedValueOnce(new Response('{}', { status: 404 }));
      expect(await (await handler(req({ p_path: '/', p_visitor_hash: HASH }))).json()).toEqual({ tracked: false });
      rpc.mockRejectedValueOnce(new ServiceUnavailableError());
      expect(await (await handler(req({ p_path: '/', p_visitor_hash: HASH }))).json()).toEqual({ tracked: false });
    } finally {
      warn.mockRestore();
    }
  });
});
