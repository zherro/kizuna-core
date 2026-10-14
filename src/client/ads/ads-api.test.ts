import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GOOGLE_CREATIVE_ID } from '../../shared/ads';
import { isAutomated } from '../analytics/visitor';
import { __resetAdPool, loadAdPool, trackAd } from './ads-api';

vi.mock('../analytics/visitor', () => ({ isAutomated: vi.fn(() => false) }));

afterEach(() => { __resetAdPool(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('loadAdPool', () => {
  it('busca uma vez e memoiza', async () => {
    const f = vi.fn(async (url: string) =>
      new Response(JSON.stringify({ items: url.includes('ad_slots') ? [{ slug: 'a' }] : [{ id: 'c' }] })));
    vi.stubGlobal('fetch', f);
    const a = await loadAdPool();
    const b = await loadAdPool();
    expect(f).toHaveBeenCalledTimes(2); // ad_slots + ad_creatives, uma vez só
    expect(a).toBe(b);
    expect(a.slots).toEqual([{ slug: 'a' }]);
  });
  it('erro de rede → pool vazio, sem lançar', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('x'); }));
    await expect(loadAdPool()).resolves.toEqual({ slots: [], creatives: [] });
  });
  it('usa pageSize 100 para ad_slots e 200 para ad_creatives', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ items: [] })));
    vi.stubGlobal('fetch', f);
    await loadAdPool();
    const urls = f.mock.calls.map((c) => String(c[0]));
    expect(urls.find((u) => u.includes('ad_slots'))).toContain('pageSize=100');
    expect(urls.find((u) => u.includes('ad_creatives'))).toContain('pageSize=200');
  });
  it('falha de um recurso não zera o outro (corpo malformado)', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) =>
      url.includes('ad_slots')
        ? new Response('<html>not json')
        : new Response(JSON.stringify({ items: [{ id: 'c' }] }))));
    await expect(loadAdPool()).resolves.toEqual({ slots: [], creatives: [{ id: 'c' }] });
  });
  it('status não-ok em um recurso mantém o outro', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) =>
      url.includes('ad_slots')
        ? new Response('err', { status: 500 })
        : new Response(JSON.stringify({ items: [{ slug: 'a' }] }))));
    await expect(loadAdPool()).resolves.toEqual({ slots: [], creatives: [{ slug: 'a' }] });
  });
});

describe('trackAd', () => {
  const sent: { url: string; body: unknown }[] = [];
  const payload = { slot: 'home-topo', creativeId: 'cre-1', page: '/', event: 'impression' as const };

  beforeEach(() => {
    sent.length = 0;
    vi.mocked(isAutomated).mockReturnValue(false);
    vi.stubGlobal('window', {});
  });

  function stubBeacon(result: boolean | undefined) {
    const beacon = vi.fn((url: string, data: Blob) => {
      void data.text().then((t) => sent.push({ url, body: JSON.parse(t) }));
      return result;
    });
    vi.stubGlobal('navigator', { sendBeacon: beacon, userAgent: 'Mozilla/5.0' });
    return beacon;
  }

  it('sentinela GOOGLE_CREATIVE_ID vira p_creative_id null', async () => {
    const beacon = stubBeacon(true);
    trackAd({ ...payload, creativeId: GOOGLE_CREATIVE_ID });
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(beacon).toHaveBeenCalledOnce();
    expect(sent[0].body).toEqual({ p_slot: 'home-topo', p_creative_id: null, p_page: '/', p_event: 'impression' });
  });

  it('criativo real é preservado no body', async () => {
    stubBeacon(true);
    trackAd({ ...payload, event: 'click' });
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0].url).toBe('/api/resources/fn_ad_track');
    expect(sent[0].body).toEqual({ p_slot: 'home-topo', p_creative_id: 'cre-1', p_page: '/', p_event: 'click' });
  });

  it('no-op quando isAutomated() é true', () => {
    vi.mocked(isAutomated).mockReturnValue(true);
    const beacon = stubBeacon(true);
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    trackAd(payload);
    expect(beacon).not.toHaveBeenCalled();
    expect(f).not.toHaveBeenCalled();
  });

  it('cai no fetch keepalive quando sendBeacon ausente', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0' });
    const f = vi.fn(async () => new Response(null));
    vi.stubGlobal('fetch', f);
    trackAd(payload);
    expect(f).toHaveBeenCalledOnce();
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/resources/fn_ad_track');
    expect(init.keepalive).toBe(true);
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ p_slot: 'home-topo', p_creative_id: 'cre-1', p_page: '/', p_event: 'impression' });
  });

  it('cai no fetch keepalive quando sendBeacon retorna false', () => {
    stubBeacon(false);
    const f = vi.fn(async () => new Response(null));
    vi.stubGlobal('fetch', f);
    trackAd(payload);
    expect(f).toHaveBeenCalledOnce();
    expect((f.mock.calls[0] as unknown as [string, RequestInit])[1].keepalive).toBe(true);
  });
});
