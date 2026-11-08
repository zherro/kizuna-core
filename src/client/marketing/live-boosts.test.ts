import { afterEach, describe, expect, it, vi } from 'vitest';
import { __resetLiveBoosts, fetchLiveBoosts, loadLiveBoosts } from './live-boosts';

afterEach(() => {
  __resetLiveBoosts();
  vi.unstubAllGlobals();
});

describe('fetchLiveBoosts', () => {
  it('pede sem cache e devolve o conjunto de uids', async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [{ serviceUid: 'a' }, { serviceUid: 'b' }] }) });
    vi.stubGlobal('fetch', f);
    const set = await fetchLiveBoosts();
    expect([...set]).toEqual(['a', 'b']);
    expect(f.mock.calls[0][1]).toMatchObject({ cache: 'no-store' });
  });

  it('erro de rede ou HTTP vira conjunto vazio (nada de selo)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('x')));
    expect((await fetchLiveBoosts()).size).toBe(0);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    expect((await fetchLiveBoosts()).size).toBe(0);
  });
});

describe('loadLiveBoosts', () => {
  it('junta pedidos simultâneos, mas refaz depois de 10 s', async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [] }) });
    vi.stubGlobal('fetch', f);
    await Promise.all([loadLiveBoosts(1000), loadLiveBoosts(2000), loadLiveBoosts(9000)]);
    expect(f).toHaveBeenCalledTimes(1);
    await loadLiveBoosts(12_000);
    expect(f).toHaveBeenCalledTimes(2);
  });
});
