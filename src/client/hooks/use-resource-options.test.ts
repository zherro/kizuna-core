// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { fetchResourceList } from './shared/fetch-resource';
import { useResourceOptions } from './use-resource-options';

function mockFetchOnce(items: unknown[]) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ items }),
  });
}

/** URL da chamada nº `call` (0-based) feita ao `fetch` mockado. */
function calledUrl(fetchMock: ReturnType<typeof vi.fn>, call = 0): URL {
  return new URL(String(fetchMock.mock.calls[call]![0]), 'http://x');
}

beforeEach(() => {
  vi.useRealTimers();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('fetchResourceList', () => {
  it('usa pageSize 1000 por default', async () => {
    const f = mockFetchOnce([]);
    vi.stubGlobal('fetch', f);
    await fetchResourceList('categories');
    expect(calledUrl(f).searchParams.get('pageSize')).toBe('1000');
  });

  it('propaga pageSize, search e orderBy', async () => {
    const f = mockFetchOnce([]);
    vi.stubGlobal('fetch', f);
    await fetchResourceList('categories', undefined, 'erro', {
      pageSize: 25,
      search: '  jardim ',
      orderBy: 'name',
    });
    const q = calledUrl(f).searchParams;
    expect(q.get('pageSize')).toBe('25');
    expect(q.get('search')).toBe('jardim');
    expect(q.get('orderBy')).toBe('name');
  });

  it('omite search vazio e mantém os filtros', async () => {
    const f = mockFetchOnce([]);
    vi.stubGlobal('fetch', f);
    await fetchResourceList('subcategories', { category_id: 3 }, 'erro', { search: '   ' });
    const q = calledUrl(f).searchParams;
    expect(q.has('search')).toBe(false);
    expect(q.get('filter.category_id')).toBe('3');
  });
});

describe('useResourceOptions', () => {
  it('carrega as opções no mount', async () => {
    const f = mockFetchOnce([{ id: 1, name: 'A' }]);
    vi.stubGlobal('fetch', f);
    const { result } = renderHook(() => useResourceOptions({ resource: 'categories' }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.options).toEqual([{ id: 1, name: 'A' }]);
  });

  it('colapsa uma rajada de teclas num único fetch de busca', async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [] }) });
    vi.stubGlobal('fetch', f);

    const { rerender } = renderHook(
      ({ s }) => useResourceOptions({ resource: 'categories', search: s }),
      { initialProps: { s: '' } }
    );

    await waitFor(() => expect(f).toHaveBeenCalledTimes(1)); // mount

    rerender({ s: 'j' });
    rerender({ s: 'ja' });
    rerender({ s: 'jar' });

    // uma única chamada extra, com o termo final
    await waitFor(() => expect(f).toHaveBeenCalledTimes(2));
    await new Promise((r) => setTimeout(r, 300));
    expect(f).toHaveBeenCalledTimes(2);
    expect(calledUrl(f, 1).searchParams.get('search')).toBe('jar');
  });

  it('descarta a resposta de um request superado', async () => {
    const deferred: Array<(v: unknown) => void> = [];
    const f = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          deferred.push(resolve);
        })
    );
    vi.stubGlobal('fetch', f);

    const { result, rerender } = renderHook(({ r }) => useResourceOptions({ resource: r }), {
      initialProps: { r: 'categories' },
    });

    rerender({ r: 'funcoes' });

    // resolve a 2ª (atual) primeiro, depois a 1ª (superada)
    deferred[1]!({ ok: true, json: async () => ({ items: [{ id: 2, name: 'nova' }] }) });
    await waitFor(() => expect(result.current.options).toEqual([{ id: 2, name: 'nova' }]));
    deferred[0]!({ ok: true, json: async () => ({ items: [{ id: 1, name: 'velha' }] }) });
    await new Promise((r) => setTimeout(r, 0));

    expect(result.current.options).toEqual([{ id: 2, name: 'nova' }]);
  });
});
