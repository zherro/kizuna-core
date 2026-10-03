import { beforeEach, describe, expect, it, vi } from 'vitest';

const { serverFetchResource, pgrstRpc } = vi.hoisted(() => ({
  serverFetchResource: vi.fn(),
  pgrstRpc: vi.fn(),
}));

vi.mock('../postgrest-crud', () => ({ serverFetchResource }));
vi.mock('../postrest/conn', () => ({ pgrstRpc }));

import {
  loadCategoryRail,
  DEFAULT_CATEGORY_RAIL_LIMIT,
  CATEGORY_RAIL_POOL_FACTOR,
} from './category-rail-data';

const rows = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ uid: `uid-${i}`, title: `Item ${i}` }));

const rpcReturns = (items: unknown[]) =>
  pgrstRpc.mockResolvedValue(new Response(JSON.stringify(items), { status: 200 }));

beforeEach(() => {
  serverFetchResource.mockReset();
  pgrstRpc.mockReset();
  serverFetchResource.mockResolvedValue([{ id: 7, name: 'Cinema', slug: 'cinema' }]);
});

describe('loadCategoryRail', () => {
  it('resolve o slug e busca pela categoria com o limite pedido', async () => {
    rpcReturns(rows(3));
    const rail = await loadCategoryRail('cinema');

    expect(serverFetchResource).toHaveBeenCalledWith(
      'categories_public',
      { slug: 'cinema', active: 'true' },
      expect.objectContaining({ auth: null, limit: 1 })
    );
    const body = pgrstRpc.mock.calls[0][1];
    expect(body.p_category_id).toBe(7);
    expect(body.p_page_size).toBe(DEFAULT_CATEGORY_RAIL_LIMIT * CATEGORY_RAIL_POOL_FACTOR);
    expect(rail?.category).toEqual({ id: 7, name: 'Cinema', slug: 'cinema' });
    expect(rail?.items).toHaveLength(3);
  });

  it('o padrão é 10 itens', () => {
    expect(DEFAULT_CATEGORY_RAIL_LIMIT).toBe(10);
  });

  it('hasMore só quando o pool passa do limite', async () => {
    rpcReturns(rows(11));
    expect((await loadCategoryRail('cinema', { limit: 10 }))?.hasMore).toBe(true);

    rpcReturns(rows(10));
    expect((await loadCategoryRail('cinema', { limit: 10 }))?.hasMore).toBe(false);
  });

  it('por grupo: resolve em categories_group e filtra pelo slug do grupo', async () => {
    serverFetchResource.mockResolvedValue([{ id: 2, name: 'Cinema', slug: 'cinema' }]);
    rpcReturns(rows(3));
    const rail = await loadCategoryRail({ group: 'cinema' });

    expect(serverFetchResource).toHaveBeenCalledWith(
      'categories_group',
      { slug: 'cinema', active: 'true' },
      expect.objectContaining({ auth: null, limit: 1 })
    );
    const body = pgrstRpc.mock.calls[0][1];
    expect(body.p_group_category_slug).toBe('cinema');
    expect(body.p_category_id).toBeNull();
    expect(rail?.kind).toBe('group');
  });

  it('seed muda a cada geração (não fixo por slug)', async () => {
    rpcReturns(rows(3));
    await loadCategoryRail('cinema');
    rpcReturns(rows(3));
    await loadCategoryRail('cinema');
    expect(pgrstRpc.mock.calls[0][1].p_seed).not.toBe(pgrstRpc.mock.calls[1][1].p_seed);
  });

  it('respeita um limite customizado', async () => {
    rpcReturns(rows(5));
    const rail = await loadCategoryRail('cinema', { limit: 4 });
    expect(pgrstRpc.mock.calls[0][1].p_page_size).toBe(4 * CATEGORY_RAIL_POOL_FACTOR);
    expect(rail?.limit).toBe(4);
    expect(rail?.hasMore).toBe(true);
  });

  it('retorna null se a categoria não existe, sem chamar a busca', async () => {
    serverFetchResource.mockResolvedValue([]);
    expect(await loadCategoryRail('nao-existe')).toBeNull();
    expect(pgrstRpc).not.toHaveBeenCalled();
  });

  it('retorna null se a categoria não tem anúncios', async () => {
    rpcReturns([]);
    expect(await loadCategoryRail('cinema')).toBeNull();
  });

  it('retorna null se a leitura da categoria falha', async () => {
    serverFetchResource.mockRejectedValue(new Error('boom'));
    expect(await loadCategoryRail('cinema')).toBeNull();
  });
});
