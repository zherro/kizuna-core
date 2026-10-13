import { beforeEach, describe, expect, it, vi } from 'vitest';

const { pgrstRpc } = vi.hoisted(() => ({ pgrstRpc: vi.fn() }));
vi.mock('../postrest/conn', () => ({ pgrstRpc }));
vi.mock('../postgrest-crud', () => ({ serverFetchResource: vi.fn() }));
// `../regions` lê o kizuna.config.json do projeto (alias `@/`), que não existe aqui.
vi.mock('../regions', () => ({ projectRegions: [], withProjectRegionCities: <T>(b: T) => b }));

import { buildTagSearchParams, loadServicesByTags } from './tag-rail-data';
import { CATEGORY_RAIL_POOL_FACTOR } from './category-rail-data';

const rows = (n: number, prefix = 'uid') =>
  Array.from({ length: n }, (_, i) => ({ uid: `${prefix}-${i}`, title: `Item ${i}` }));

const rpcReturns = (items: unknown[]) =>
  pgrstRpc.mockResolvedValue(new Response(JSON.stringify(items), { status: 200 }));

beforeEach(() => pgrstRpc.mockReset());

describe('buildTagSearchParams', () => {
  it('normaliza as tags e só manda p_city_ibges com irmãs', () => {
    expect(buildTagSearchParams([' Local:X ', 'local:x', ''], { pageSize: 5 })).toEqual({
      p_tags: ['local:x'],
      p_page_size: 5,
      p_city_ibge: null,
    });
    expect(
      buildTagSearchParams(['a'], { pageSize: 5, cityIbges: ['5103403', '5108402'] })
    ).toMatchObject({ p_city_ibge: '5103403', p_city_ibges: ['5103403', '5108402'] });
    expect(buildTagSearchParams(['a'], { pageSize: 5, cityIbge: '5103403' })).not.toHaveProperty(
      'p_city_ibges'
    );
  });

  it('sem tag válida → null', () => {
    expect(buildTagSearchParams([], { pageSize: 5 })).toBeNull();
    expect(buildTagSearchParams(['  '], { pageSize: 5 })).toBeNull();
    expect(buildTagSearchParams('shopping', { pageSize: 5 })).toBeNull();
  });
});

describe('loadServicesByTags', () => {
  it('chama a RPC com p_tags e exclui o próprio anúncio', async () => {
    rpcReturns([{ uid: 'self' }, ...rows(3)]);
    const data = await loadServicesByTags(['local:x'], { limit: 2, excludeUid: 'self' });

    const body = pgrstRpc.mock.calls[0][1];
    expect(pgrstRpc.mock.calls[0][0]).toBe('fn_search_services');
    expect(body.p_tags).toEqual(['local:x']);
    // pool + 1 (o excluído)
    expect(body.p_page_size).toBe(2 * CATEGORY_RAIL_POOL_FACTOR + 1);
    expect(data?.items.map((i) => i.uid)).toEqual(['uid-0', 'uid-1', 'uid-2']);
    expect(data?.hasMore).toBe(true);
    expect(data?.tags).toEqual(['local:x']);
  });

  it('sem tag não chama a RPC; sem itens → null', async () => {
    expect(await loadServicesByTags([])).toBeNull();
    expect(pgrstRpc).not.toHaveBeenCalled();

    rpcReturns([{ uid: 'self' }]);
    expect(await loadServicesByTags(['a'], { excludeUid: 'self' })).toBeNull();
  });

  it('erro da RPC vira null', async () => {
    pgrstRpc.mockResolvedValue(new Response('erro', { status: 500 }));
    expect(await loadServicesByTags(['a'])).toBeNull();
  });
});
