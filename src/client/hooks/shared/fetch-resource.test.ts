import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchResourceList, __resetFetchResourceCache } from './fetch-resource';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  __resetFetchResourceCache();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => ({ ok: true, json: async () => ({ items: [{ id: 1 }] }) }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('fetchResourceList dedupe', () => {
  it('3 chamadas simultâneas com dedupe fazem 1 fetch', async () => {
    const rows = await Promise.all([1, 2, 3].map(() => fetchResourceList('a', undefined, undefined, { dedupe: true })));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(rows[2]).toEqual([{ id: 1 }]);
  });

  it('sem dedupe faz 3 fetches', async () => {
    await Promise.all([1, 2, 3].map(() => fetchResourceList('a')));
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('rejeição não fica em cache', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'x' }) });
    await expect(fetchResourceList('a', undefined, undefined, { dedupe: true })).rejects.toThrow('x');
    await fetchResourceList('a', undefined, undefined, { dedupe: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('refaz depois do ttl', async () => {
    await fetchResourceList('a', undefined, undefined, { dedupe: { ttlMs: 1000 } });
    vi.advanceTimersByTime(999);
    await fetchResourceList('a', undefined, undefined, { dedupe: { ttlMs: 1000 } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2);
    await fetchResourceList('a', undefined, undefined, { dedupe: { ttlMs: 1000 } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('URLs distintas não colidem', async () => {
    await fetchResourceList('a', undefined, undefined, { dedupe: true });
    await fetchResourceList('b', undefined, undefined, { dedupe: true });
    await fetchResourceList('a', { x: 1 }, undefined, { dedupe: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
