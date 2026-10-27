// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchOwnerStats, sendTrack, trackEvent } from './analytics-api';
import { getVisitorId, isAutomated } from './visitor';

const ID = '0b1d5a1e-7c3e-4a9a-9d0e-2f5f6a7b8c9d';
const fetchMock = vi.fn();

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset().mockResolvedValue(new Response('{}', { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('getVisitorId', () => {
  it('gera 32 hex, estável no mesmo dia e novo no dia seguinte', () => {
    const d1 = new Date('2026-09-29T10:00:00Z');
    const id = getVisitorId(d1);
    expect(id).toMatch(/^[0-9a-f]{32}$/);
    expect(getVisitorId(new Date('2026-09-29T23:00:00Z'))).toBe(id);
    expect(getVisitorId(new Date('2026-09-30T00:10:00Z'))).not.toBe(id);
  });
});

describe('isAutomated', () => {
  it('detecta webdriver, UA de bot e UA vazio', () => {
    expect(isAutomated({ webdriver: true, userAgent: 'Mozilla/5.0 Chrome/126' })).toBe(true);
    expect(isAutomated({ webdriver: false, userAgent: 'Googlebot/2.1' })).toBe(true);
    expect(isAutomated({ webdriver: false, userAgent: 'HeadlessChrome/126' })).toBe(true);
    expect(isAutomated({ webdriver: false, userAgent: '' })).toBe(true);
    expect(isAutomated({ webdriver: false, userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/126 Safari/537.36' })).toBe(false);
    expect(isAutomated({ webdriver: false, userAgent: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36 Telegram-Android/10.0' })).toBe(false);
    expect(isAutomated({ webdriver: false, userAgent: 'TelegramBot (like TwitterBot)' })).toBe(true);
  });
});

describe('sendTrack / trackEvent', () => {
  it('posta no resource da RPC com os args p_*', () => {
    sendTrack({ entityType: 'service', entityId: ID, event: 'view', visibleMs: 1600.4, source: 'search' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/analytics/track');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      p_entity_type: 'service',
      p_entity_id: ID,
      p_event_type: 'view',
      p_source: 'search',
      p_visible_ms: 1600,
    });
    expect(body.p_visitor_hash).toMatch(/^[0-9a-f]{32}$/);
  });

  it('envia p_device classificado e nunca o user-agent', () => {
    sendTrack({ entityType: 'service', entityId: ID, event: 'view', visibleMs: 1600 });
    const raw = fetchMock.mock.calls[0]![1].body as string;
    expect(JSON.parse(raw).p_device).toMatch(/^(mobile|tablet|desktop)$/);
    expect(raw).not.toContain(navigator.userAgent);
  });

  it('classifica como mobile pelo UA de celular', () => {
    vi.stubGlobal('navigator', {
      webdriver: false,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
    });
    sendTrack({ entityType: 'service', entityId: ID, event: 'view', visibleMs: 1600 });
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).p_device).toBe('mobile');
  });

  it('sendBeacon aponta para a rota do servidor', () => {
    const beacon = vi.fn().mockReturnValue(true);
    vi.stubGlobal('navigator', { webdriver: false, userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/126 Safari/537.36', sendBeacon: beacon });
    sendTrack({ entityType: 'service', entityId: ID, event: 'view', visibleMs: 1600 });
    expect(beacon).toHaveBeenCalledTimes(1);
    expect(beacon.mock.calls[0][0]).toBe('/api/analytics/track');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('trackEvent envia visible_ms 0 e origem padrão', () => {
    trackEvent({ entityType: 'service', entityId: ID, event: 'contact_click' });
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(body).toMatchObject({ p_event_type: 'contact_click', p_visible_ms: 0, p_source: 'direct' });
  });

  it('não envia em automação', () => {
    vi.stubGlobal('navigator', { webdriver: true, userAgent: 'Mozilla/5.0 Chrome/126' });
    sendTrack({ entityType: 'service', entityId: ID, event: 'view', visibleMs: 2000 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('falha de rede não lança', () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    expect(() => trackEvent({ entityType: 'service', entityId: ID, event: 'share' })).not.toThrow();
  });
});

describe('fetchOwnerStats', () => {
  const today = new Date().toISOString().slice(0, 10);
  const page = (items: unknown[]) => new Response(JSON.stringify({ items }), { status: 200 });

  it('lê o resource paginado e agrega', async () => {
    fetchMock.mockResolvedValue(
      page([{ entity_id: ID, visitor_hash: 'a'.repeat(32), day: today, event_type: 'view', source: 'search' }])
    );
    const stats = await fetchOwnerStats(7);
    const url = String(fetchMock.mock.calls[0]![0]);
    expect(url).toContain('/api/resources/analytics_events?');
    expect(url).toContain('orderBy=id');
    expect(url).toContain('orderDirection=desc');
    expect(stats.metrics.views.value).toBe(1);
    expect(stats.series).toHaveLength(7);
  });

  it('para de paginar ao passar do início da janela anterior', async () => {
    const full = Array.from({ length: 1000 }, (_, i) => ({
      entity_id: ID, visitor_hash: String(i).padStart(32, '0'), day: '2000-01-01', event_type: 'view', source: 'search',
    }));
    fetchMock.mockResolvedValue(page(full));
    await fetchOwnerStats(7);
    expect(fetchMock).toHaveBeenCalledTimes(1); // último item já é anterior à janela
  });

  it('marca truncated ao esgotar as páginas dentro da janela', async () => {
    const full = Array.from({ length: 1000 }, (_, i) => ({
      entity_id: ID, visitor_hash: String(i).padStart(32, '0'), day: today, event_type: 'view', source: 'search',
    }));
    fetchMock.mockImplementation(async () => page(full));
    const stats = await fetchOwnerStats(7);
    expect(fetchMock).toHaveBeenCalledTimes(20);
    expect(stats.truncated).toBe(true);
  });

  it('com tenantId pagina services e agrega por categoria', async () => {
    const svc = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ uid: i === 0 ? ID : `s${i}`, title: `T${i}`, categoryId: '7', category: { name: 'Pets' } }));
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes('/services?')) {
        return String(url).includes('page=1') ? page(svc(100)) : page(svc(3));
      }
      return page([{ entity_id: ID, visitor_hash: 'a'.repeat(32), day: today, event_type: 'view', source: 'home' }]);
    });
    const stats = await fetchOwnerStats(7, undefined, { tenantId: 'tt' });
    const svcCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes('/services?'));
    expect(svcCalls).toHaveLength(2);
    expect(String(svcCalls[0]![0])).toContain('filter.tenant_id=tt');
    expect(stats.byCategory[0]).toMatchObject({ label: 'Pets', views: 1 });
    expect(stats.bySource[0]).toMatchObject({ source: 'home', views: 1 });
  });

  it('com tenantId lê review_stats e expõe a nota média (id do serviço -> uid)', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      const u = String(url);
      if (u.includes('/services?')) return page([{ id: 42, uid: ID, title: 'T', categoryId: '7', category: { name: 'Pets' } }]);
      if (u.includes('/review_stats?')) {
        return page([
          { referenceId: '42', totalReviews: 3, averageRating: 4.67 },
          { referenceId: '99', totalReviews: 5, averageRating: 1 },
        ]);
      }
      return page([{ entity_id: ID, visitor_hash: 'a'.repeat(32), day: today, event_type: 'view', source: 'home' }]);
    });
    const stats = await fetchOwnerStats(7, undefined, { tenantId: 'tt' });
    const call = fetchMock.mock.calls.find((c) => String(c[0]).includes('/review_stats?'))!;
    expect(String(call[0])).toContain('filter.domain=service');
    expect(String(call[0])).toContain('filter.tenant_id=tt');
    expect(stats.metrics.rating).toEqual({ value: 4.7, delta: 0 });
    expect(stats.ratingCount).toBe(3);
    expect(stats.entities[0]).toMatchObject({ rating: 4.7, ratingCount: 3 });
  });

  it('review_stats com erro não derruba: rating null', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      const u = String(url);
      if (u.includes('/review_stats?')) return new Response('x', { status: 500 });
      if (u.includes('/services?')) return page([{ id: 1, uid: ID, title: 'T' }]);
      return page([]);
    });
    const stats = await fetchOwnerStats(7, undefined, { tenantId: 'tt' });
    expect(stats.metrics.rating).toEqual({ value: null, delta: 0 });
  });

  it('erro HTTP lança', async () => {
    fetchMock.mockResolvedValue(new Response('x', { status: 500 }));
    await expect(fetchOwnerStats(30)).rejects.toThrow();
  });
});
