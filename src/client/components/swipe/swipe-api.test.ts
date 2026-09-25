// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchDeck, fetchLiked, recordSwipe } from './swipe-api';

const deckBody = {
  p_state: 'PR', p_city_id: null, p_city_ibge: null, p_group_category_slug: null,
  p_category_id: null, p_subcategories: null, p_query: null, p_seed: 0.1, p_page_size: 20,
  p_exclude: null, p_price_min: null, p_price_max: null,
};

const respond = (status: number, body: unknown) =>
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })));

afterEach(() => vi.unstubAllGlobals());

describe('swipe-api', () => {
  it('fetchDeck devolve os itens', async () => {
    respond(200, { items: [{ uid: 'u1' }] });
    await expect(fetchDeck(deckBody)).resolves.toEqual([{ uid: 'u1' }]);
  });

  it('fetchDeck lança em resposta não-OK (não mascara como deck vazio)', async () => {
    respond(404, { message: 'RPC nao suportada' });
    await expect(fetchDeck(deckBody)).rejects.toThrow('fn_swipe_deck 404');
  });

  it('fetchLiked lança em resposta não-OK', async () => {
    respond(401, { message: 'login' });
    await expect(fetchLiked(null, 24)).rejects.toThrow('fn_swipe_liked 401');
  });

  it('recordSwipe aceita unlike', async () => {
    respond(200, { items: [] });
    await recordSwipe(['u1'], 'unlike');
    const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ p_service_uids: ['u1'], p_action: 'unlike' });
  });
});
