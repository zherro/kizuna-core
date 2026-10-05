// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchDeck, fetchLiked, recordSwipe } from './swipe-api';

const deckBody = {
  p_state: 'MT', p_city_id: null, p_city_ibge: null, p_group_category_slug: null,
  p_category_id: null, p_subcategories: null, p_query: null, p_seed: 0.1, p_page_size: 20,
  p_exclude: null, p_price_min: null, p_price_max: null,
};

/** Responde por rota: `reactions` (GET service_reactions) e `search` (POST fn_search_services). */
function routes(opts: { reactions?: [number, unknown]; search?: [number, unknown]; other?: [number, unknown] }) {
  const fn = vi.fn(async (url: string) => {
    const [status, body] = url.includes('service_reactions?')
      ? (opts.reactions ?? [200, { items: [] }])
      : url.includes('fn_search_services')
        ? (opts.search ?? [200, { items: [] }])
        : (opts.other ?? [200, {}]);
    return new Response(JSON.stringify(body), { status });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe('swipe-api', () => {
  it('fetchDeck = busca menos o que o usuário já decidiu (curtidos e passados recentes)', async () => {
    const recent = new Date().toISOString();
    const old = new Date(Date.now() - 30 * 86_400_000).toISOString();
    routes({
      reactions: [200, { items: [
        { serviceUid: 'liked', liked: true, updatedAt: old },
        { serviceUid: 'skipped-recent', liked: false, updatedAt: recent },
        { serviceUid: 'skipped-old', liked: false, updatedAt: old },
      ] }],
      search: [200, { items: [{ uid: 'liked' }, { uid: 'skipped-recent' }, { uid: 'skipped-old' }, { uid: 'novo' }] }],
    });
    const deck = await fetchDeck({ ...deckBody, p_exclude: ['novo'] });
    expect(deck.map((d) => d.uid)).toEqual(['skipped-old']);
  });

  it('fetchDeck anônimo (401 nas reações) usa só a busca', async () => {
    routes({ reactions: [401, {}], search: [200, { items: [{ uid: 'a' }] }] });
    await expect(fetchDeck(deckBody)).resolves.toEqual([{ uid: 'a' }]);
  });

  it('fetchDeck aplica a faixa de preço (sem preço passa)', async () => {
    routes({ search: [200, { items: [{ uid: 'barato', price: 10 }, { uid: 'caro', price: 500 }, { uid: 'consulta', price: null }] }] });
    const deck = await fetchDeck({ ...deckBody, p_price_max: 100 });
    expect(deck.map((d) => d.uid)).toEqual(['barato', 'consulta']);
  });

  it('fetchDeck lança se a busca falhar (não mascara como deck vazio)', async () => {
    routes({ search: [500, {}] });
    await expect(fetchDeck(deckBody)).rejects.toThrow('fn_search_services 500');
  });

  it('fetchLiked lê o resource liked_services e lança em não-OK', async () => {
    const fn = routes({ other: [401, {}] });
    await expect(fetchLiked(1, 24)).rejects.toThrow('liked_services 401');
    expect(String(fn.mock.calls[0][0])).toContain('/api/resources/liked_services?');
    expect(String(fn.mock.calls[0][0])).toContain('filter.action=like');
  });

  it('recordSwipe grava pelo resource service_reactions; unlike vira não-curtido', async () => {
    const fn = routes({ other: [201, { item: {} }] });
    await recordSwipe(['u1'], 'unlike');
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/resources/service_reactions');
    expect(JSON.parse(String(init.body))).toEqual({ serviceUid: 'u1', liked: false });
  });
});
