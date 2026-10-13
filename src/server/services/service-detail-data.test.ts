import { beforeEach, describe, expect, it, vi } from 'vitest';

const { serverFetchResource, pgrstRpc } = vi.hoisted(() => ({
  serverFetchResource: vi.fn(),
  pgrstRpc: vi.fn(),
}));

vi.mock('../postgrest-crud', () => ({ serverFetchResource }));
vi.mock('../postrest/conn', () => ({ pgrstRpc }));
vi.mock('../regions', () => ({ projectRegions: [], withProjectRegionCities: <T,>(b: T) => b }));

import { ensureServiceTaxonomy } from './service-detail-data';
import type { ServiceRecord } from '../../client/components/services/service-type';

const base = (over: Partial<ServiceRecord> = {}) =>
  ({
    id: '1',
    uid: 'u1',
    title: 'Show',
    categoryId: '7',
    categoryGroupId: null,
    categoryGroup: null,
    category: { id: '7', name: 'Shows', slug: 'shows' },
    ...over,
  }) as ServiceRecord;

beforeEach(() => serverFetchResource.mockReset());

describe('ensureServiceTaxonomy', () => {
  it('não busca nada quando categoria e grupo já têm slug', async () => {
    const svc = base({ categoryGroup: { id: '2', name: 'Eventos', slug: 'eventos' } });
    await ensureServiceTaxonomy(svc);
    expect(serverFetchResource).not.toHaveBeenCalled();
  });

  it('deriva o grupo pela categoria quando services.category_group_id é nulo', async () => {
    serverFetchResource
      .mockResolvedValueOnce([{ id: 7, slug: 'shows', categoryGroupId: 2 }])
      .mockResolvedValueOnce([{ id: 2, name: 'Eventos', slug: 'eventos', active: true }]);
    const svc = await ensureServiceTaxonomy(base());

    expect(serverFetchResource).toHaveBeenNthCalledWith(
      1,
      'categories_public',
      { id: '7' },
      expect.objectContaining({ auth: null })
    );
    expect(serverFetchResource).toHaveBeenNthCalledWith(
      2,
      'categories_group',
      { id: '2' },
      expect.objectContaining({ auth: null })
    );
    expect(svc.categoryGroup).toMatchObject({ id: '2', name: 'Eventos', slug: 'eventos' });
    expect(svc.categoryGroupId).toBe('2');
  });

  it('completa o slug da categoria quando o embed veio sem ele', async () => {
    serverFetchResource
      .mockResolvedValueOnce([{ id: 7, slug: 'shows', categoryGroupId: 2 }])
      .mockResolvedValueOnce([{ id: 2, name: 'Eventos', slug: 'eventos' }]);
    const svc = await ensureServiceTaxonomy(base({ category: { id: '7', name: 'Shows' } }));
    expect(svc.category?.slug).toBe('shows');
    expect(svc.category?.name).toBe('Shows');
  });

  it('mantém o anúncio intacto quando a categoria não tem grupo ou o recurso falha', async () => {
    serverFetchResource.mockResolvedValueOnce([{ id: 7, slug: 'shows', categoryGroupId: null }]);
    const a = await ensureServiceTaxonomy(base());
    expect(a.categoryGroup).toBeNull();

    serverFetchResource.mockRejectedValueOnce(new Error('boom'));
    const b = await ensureServiceTaxonomy(base());
    expect(b.categoryGroup).toBeNull();
  });
});
