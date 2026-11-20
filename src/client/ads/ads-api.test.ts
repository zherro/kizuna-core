import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GOOGLE_CREATIVE_ID } from '../../shared/ads';
import { isAutomated } from '../analytics/visitor';
import { __resetAdPool, __resetAdTrackSeen, loadAdPool, loadLiveCampaigns, trackAd } from './ads-api';

const VID = 'ab'.repeat(16);
vi.mock('../analytics/visitor', () => ({ isAutomated: vi.fn(() => false), getVisitorId: vi.fn(() => 'ab'.repeat(16)) }));

afterEach(() => { __resetAdPool(); __resetAdTrackSeen(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

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
    vi.stubGlobal('sessionStorage', memoryStorage());
  });

  function memoryStorage() {
    const m = new Map<string, string>();
    return {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, String(v)),
      removeItem: (k: string) => void m.delete(k),
      clear: () => m.clear(),
    };
  }

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
    expect(sent[0].body).toEqual({ p_slot: 'home-topo', p_creative_id: null, p_page: '/', p_event: 'impression', p_visitor_hash: VID });
  });

  it('criativo real é preservado no body', async () => {
    stubBeacon(true);
    trackAd({ ...payload, event: 'click' });
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0].url).toBe('/api/resources/fn_ad_track_v2');
    expect(sent[0].body).toEqual({ p_slot: 'home-topo', p_creative_id: 'cre-1', p_page: '/', p_event: 'click', p_visitor_hash: VID });
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
    expect(url).toBe('/api/resources/fn_ad_track_v2');
    expect(init.keepalive).toBe(true);
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ p_slot: 'home-topo', p_creative_id: 'cre-1', p_page: '/', p_event: 'impression', p_visitor_hash: VID });
  });

  it('cai no fetch keepalive quando sendBeacon retorna false', () => {
    stubBeacon(false);
    const f = vi.fn(async () => new Response(null));
    vi.stubGlobal('fetch', f);
    trackAd(payload);
    expect(f).toHaveBeenCalledOnce();
    expect((f.mock.calls[0] as unknown as [string, RequestInit])[1].keepalive).toBe(true);
  });

  it('mesma impressão (espaço + criativo) só sai uma vez na sessão do dia', () => {
    const beacon = stubBeacon(true);
    trackAd(payload);
    trackAd({ ...payload, page: '/outra' });
    expect(beacon).toHaveBeenCalledOnce();
  });

  it('recarregar a página (memória zerada, sessionStorage mantido) não reenvia', () => {
    const beacon = stubBeacon(true);
    trackAd(payload);
    __resetAdTrackSeen();
    trackAd(payload);
    expect(beacon).toHaveBeenCalledOnce();
  });

  it('outro espaço, outro criativo ou outro evento contam separado', () => {
    const beacon = stubBeacon(true);
    trackAd(payload);
    trackAd({ ...payload, slot: 'home-meio' });
    trackAd({ ...payload, creativeId: 'cre-2' });
    trackAd({ ...payload, event: 'click' });
    expect(beacon).toHaveBeenCalledTimes(4);
  });

  it('duplo clique rápido envia um clique só', () => {
    const beacon = stubBeacon(true);
    trackAd({ ...payload, event: 'click' });
    trackAd({ ...payload, event: 'click' });
    expect(beacon).toHaveBeenCalledOnce();
  });

  it('sem sessionStorage (modo privado) deduplica em memória', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => { throw new Error('x'); },
      setItem: () => { throw new Error('x'); },
    });
    const beacon = stubBeacon(true);
    trackAd(payload);
    trackAd(payload);
    expect(beacon).toHaveBeenCalledOnce();
  });

  it('robô não marca como visto (não consome a vaga)', () => {
    vi.mocked(isAutomated).mockReturnValueOnce(true);
    const beacon = stubBeacon(true);
    trackAd(payload);
    trackAd(payload);
    expect(beacon).toHaveBeenCalledOnce();
  });
});

describe('loadLiveCampaigns', () => {
  it('busca vw_ad_campaigns_live sem cache, uma vez, e descarta linhas incompletas', async () => {
    const f = vi.fn(async () =>
      new Response(JSON.stringify({ items: [{ creativeId: 'c1', slotSlug: 'home-meio' }, { creativeId: 'c2' }] })));
    vi.stubGlobal('fetch', f);
    const a = await loadLiveCampaigns();
    await loadLiveCampaigns();
    expect(f).toHaveBeenCalledOnce();
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/api/resources/vw_ad_campaigns_live');
    expect(init.cache).toBe('no-store');
    expect(a).toEqual([{ creativeId: 'c1', slotSlug: 'home-meio' }]);
  });
  it('recurso ausente (projeto sem marketing) → lista vazia', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })));
    await expect(loadLiveCampaigns()).resolves.toEqual([]);
  });
});
