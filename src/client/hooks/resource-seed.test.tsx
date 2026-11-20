// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { __resetFetchResourceCache } from './shared/fetch-resource';
import { pickResourceSeed, ResourceSeedProvider, type ResourceSeed } from './resource-seed';
import { useResourceOptions } from './use-resource-options';

const GROUPS: ResourceSeed = {
  resource: 'categories_group_public',
  items: [
    { id: 1, name: 'Eventos', slug: 'eventos' },
    { id: 2, name: 'Lugares', slug: 'lugares' },
  ],
  pageSize: 1000,
  complete: true,
};

const STATS_PARTIAL: ResourceSeed = {
  resource: 'category_stats',
  items: [{ id: 'a', categoryId: 1 }],
  pageSize: 1000,
  complete: false,
};

function wrapper(seeds: (ResourceSeed | null)[]) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <ResourceSeedProvider seeds={seeds}>{children}</ResourceSeedProvider>;
  };
}

beforeEach(() => {
  __resetFetchResourceCache();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('pickResourceSeed', () => {
  it('lista completa serve para qualquer pageSize que caiba', () => {
    expect(pickResourceSeed([GROUPS], { resource: 'categories_group_public', pageSize: 100 })).toBe(
      GROUPS.items
    );
    expect(pickResourceSeed([GROUPS], { resource: 'categories_group_public' })).toBe(GROUPS.items);
    expect(pickResourceSeed([GROUPS], { resource: 'categories_group_public', pageSize: 1 })).toBeNull();
  });

  it('lista parcial só serve para o mesmo pageSize', () => {
    expect(pickResourceSeed([STATS_PARTIAL], { resource: 'category_stats' })).toBe(STATS_PARTIAL.items);
    expect(pickResourceSeed([STATS_PARTIAL], { resource: 'category_stats', pageSize: 500 })).toBeNull();
  });

  it('filtro, busca ou ordenação própria vão à rede', () => {
    expect(
      pickResourceSeed([GROUPS], { resource: 'categories_group_public', filter: { active: true } })
    ).toBeNull();
    expect(pickResourceSeed([GROUPS], { resource: 'categories_group_public', search: 'ev' })).toBeNull();
    expect(pickResourceSeed([GROUPS], { resource: 'categories_group_public', orderBy: 'name' })).toBeNull();
    expect(pickResourceSeed([GROUPS], { resource: 'outro' })).toBeNull();
  });
});

describe('useResourceOptions + ResourceSeedProvider', () => {
  it('com semente: nasce pronto e não faz fetch', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    const { result } = renderHook(
      () => useResourceOptions({ resource: 'categories_group_public', pageSize: 100, dedupe: true }),
      { wrapper: wrapper([GROUPS]) }
    );
    expect(result.current.loading).toBe(false);
    expect(result.current.options).toBe(GROUPS.items);
    await new Promise((r) => setTimeout(r, 0));
    expect(f).not.toHaveBeenCalled();
  });

  it('sem dedupe a semente é ignorada (busca como antes)', async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [{ id: 9 }] }) });
    vi.stubGlobal('fetch', f);
    const { result } = renderHook(() => useResourceOptions({ resource: 'categories_group_public' }), {
      wrapper: wrapper([GROUPS]),
    });
    await waitFor(() => expect(result.current.options).toEqual([{ id: 9 }]));
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('enabled=false continua sem opções mesmo com semente', () => {
    vi.stubGlobal('fetch', vi.fn());
    const { result } = renderHook(
      () => useResourceOptions({ resource: 'categories_group_public', enabled: false, dedupe: true }),
      { wrapper: wrapper([GROUPS]) }
    );
    expect(result.current.options).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('sem provider: comportamento de sempre (fetch no cliente)', async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [{ id: 3 }] }) });
    vi.stubGlobal('fetch', f);
    const { result } = renderHook(() =>
      useResourceOptions({ resource: 'categories_group_public', dedupe: true })
    );
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.options).toEqual([{ id: 3 }]));
  });

  it('semente nula (falha no servidor) é descartada', async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [{ id: 4 }] }) });
    vi.stubGlobal('fetch', f);
    const { result } = renderHook(
      () => useResourceOptions({ resource: 'categories_group_public', dedupe: true }),
      { wrapper: wrapper([null]) }
    );
    await waitFor(() => expect(result.current.options).toEqual([{ id: 4 }]));
  });
});
