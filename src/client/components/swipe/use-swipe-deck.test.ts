// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';

const api = vi.hoisted(() => ({ fetchDeck: vi.fn(), recordSwipe: vi.fn(async () => {}) }));
vi.mock('./swipe-api', () => api);

import { useSwipeDeck } from './use-swipe-deck';

const card = (n: number) => ({
  uid: `u${n}`, title: `T${n}`, price: null, price_type: 'quote', category: null,
  subcategory: null, sponsored: false, cover_file_id: null, provider_name: null,
  provider_avatar: null, rating: null, reviews: 0,
});
const range = (a: number, b: number) => Array.from({ length: b - a }, (_, i) => card(a + i));

const baseBody = {
  p_state: 'PR', p_city_id: null, p_city_ibge: null, p_group_category_slug: null,
  p_category_id: null, p_subcategories: null, p_query: null,
  p_price_min: null, p_price_max: null,
};

beforeEach(() => {
  localStorage.clear();
  api.fetchDeck.mockReset();
  api.recordSwipe.mockClear();
});
afterEach(() => cleanup());

describe('useSwipeDeck', () => {
  it('carrega o primeiro lote', async () => {
    api.fetchDeck.mockResolvedValueOnce(range(0, 20));
    const { result } = renderHook(() => useSwipeDeck({ baseBody, filterKey: 'a', loggedIn: true }));
    await waitFor(() => expect(result.current.cards).toHaveLength(20));
    expect(api.fetchDeck.mock.calls[0][0]).toMatchObject({ p_page_size: 20, p_exclude: null });
  });

  it('decide avança e grava quando logado', async () => {
    api.fetchDeck.mockResolvedValueOnce(range(0, 20));
    const { result } = renderHook(() => useSwipeDeck({ baseBody, filterKey: 'a', loggedIn: true }));
    await waitFor(() => expect(result.current.cards).toHaveLength(20));
    act(() => result.current.decide('like'));
    expect(result.current.cards[0].uid).toBe('u1');
    expect(api.recordSwipe).toHaveBeenCalledWith(['u0'], 'like');
  });

  it('anônimo: skip vai pro localStorage e não chama a API', async () => {
    api.fetchDeck.mockResolvedValueOnce(range(0, 20));
    const { result } = renderHook(() => useSwipeDeck({ baseBody, filterKey: 'a', loggedIn: false }));
    await waitFor(() => expect(result.current.cards).toHaveLength(20));
    act(() => result.current.decide('skip'));
    expect(api.recordSwipe).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('kizuna.swipe.anonSkips')!)).toEqual(['u0']);
  });

  it('prefetch ao restar 5, com p_exclude da fila e dedup', async () => {
    api.fetchDeck.mockResolvedValueOnce(range(0, 20)).mockResolvedValueOnce(range(18, 30));
    const { result } = renderHook(() => useSwipeDeck({ baseBody, filterKey: 'a', loggedIn: true }));
    await waitFor(() => expect(result.current.cards).toHaveLength(20));
    for (let i = 0; i < 15; i++) act(() => result.current.decide('skip'));
    await waitFor(() => expect(api.fetchDeck).toHaveBeenCalledTimes(2));
    expect(api.fetchDeck.mock.calls[1][0].p_exclude).toEqual(['u15', 'u16', 'u17', 'u18', 'u19']);
    await waitFor(() => expect(result.current.cards.map((c) => c.uid)).toEqual(
      ['u15', 'u16', 'u17', 'u18', 'u19', ...range(20, 30).map((c) => c.uid)]
    ));
  });

  it('lote vazio marca exhausted', async () => {
    api.fetchDeck.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useSwipeDeck({ baseBody, filterKey: 'a', loggedIn: true }));
    await waitFor(() => expect(result.current.exhausted).toBe(true));
  });

  it('mudar filterKey reseta', async () => {
    api.fetchDeck.mockResolvedValueOnce(range(0, 20)).mockResolvedValueOnce(range(100, 120));
    const { result, rerender } = renderHook((p: { k: string }) =>
      useSwipeDeck({ baseBody, filterKey: p.k, loggedIn: true }), { initialProps: { k: 'a' } });
    await waitFor(() => expect(result.current.cards).toHaveLength(20));
    rerender({ k: 'b' });
    await waitFor(() => expect(result.current.cards[0].uid).toBe('u100'));
  });

  it('lote não-vazio mas 100% duplicado marca exhausted e não refaz fetch', async () => {
    api.fetchDeck.mockResolvedValueOnce(range(0, 20)).mockResolvedValueOnce(range(15, 20));
    const { result } = renderHook(() => useSwipeDeck({ baseBody, filterKey: 'a', loggedIn: true }));
    await waitFor(() => expect(result.current.cards).toHaveLength(20));
    for (let i = 0; i < 15; i++) act(() => result.current.decide('skip'));
    await waitFor(() => expect(api.fetchDeck).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.exhausted).toBe(true));
    expect(api.fetchDeck).toHaveBeenCalledTimes(2);
  });

  it('duas decide() no mesmo tick agem sobre cards diferentes', async () => {
    api.fetchDeck.mockResolvedValueOnce(range(0, 20));
    const { result } = renderHook(() => useSwipeDeck({ baseBody, filterKey: 'a', loggedIn: true }));
    await waitFor(() => expect(result.current.cards).toHaveLength(20));
    act(() => {
      result.current.decide('skip');
      result.current.decide('skip');
    });
    expect(api.recordSwipe).toHaveBeenCalledWith(['u0'], 'skip');
    expect(api.recordSwipe).toHaveBeenCalledWith(['u1'], 'skip');
    expect(result.current.cards[0].uid).toBe('u2');
  });

  it('falha ao carregar expõe error, não marca exhausted e não entra em loop', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    api.fetchDeck.mockRejectedValueOnce(new Error('fn_swipe_deck 500'));
    const { result } = renderHook(() => useSwipeDeck({ baseBody, filterKey: 'a', loggedIn: true }));
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.loading).toBe(false);
    expect(result.current.exhausted).toBe(false);
    expect(result.current.cards).toEqual([]);
    await new Promise((r) => setTimeout(r, 20));
    expect(api.fetchDeck).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('reset depois do erro limpa error e recarrega', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    api.fetchDeck.mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(range(0, 20));
    const { result } = renderHook(() => useSwipeDeck({ baseBody, filterKey: 'a', loggedIn: true }));
    await waitFor(() => expect(result.current.error).toBe(true));
    act(() => result.current.reset());
    expect(result.current.error).toBe(false);
    await waitFor(() => expect(result.current.cards).toHaveLength(20));
    expect(result.current.error).toBe(false);
    warn.mockRestore();
  });
});
