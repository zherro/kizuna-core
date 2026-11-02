import { beforeEach, describe, expect, it, vi } from 'vitest';

const { serverFetchResource, pgrstRpc } = vi.hoisted(() => ({
  serverFetchResource: vi.fn(),
  pgrstRpc: vi.fn(),
}));

// `unstable_cache` exige o runtime do Next; aqui só repassa a função (o cache é do Next).
vi.mock('next/cache', () => ({ unstable_cache: <F>(fn: F) => fn }));
vi.mock('../postgrest-crud', () => ({ serverFetchResource }));
vi.mock('../postrest/conn', () => ({ pgrstRpc }));
// `../regions` lê o kizuna.config.json do projeto (alias `@/`), que não existe aqui.
vi.mock('../regions', () => ({ projectRegions: [], withProjectRegionCities: <T>(b: T) => b }));

import { loadBrowseRails, BROWSE_RAILS_TAG, BROWSE_RAILS_CACHE_SECONDS } from './browse-rails-data';

const rows = (prefix: string, n: number) =>
  Array.from({ length: n }, (_, i) => ({ uid: `${prefix}-${i}`, title: `Item ${i}` }));

const okResponse = (items: unknown[]) => new Response(JSON.stringify(items), { status: 200 });

beforeEach(() => {
  serverFetchResource.mockReset();
  pgrstRpc.mockReset();
  serverFetchResource.mockResolvedValue([
    { slug: 'eventos', name: 'Eventos' },
    { slug: 'cinema', name: 'Cinema' },
    { slug: 'outro', name: 'Outro' },
  ]);
  pgrstRpc.mockImplementation(async (_fn: string, body: { p_group_category_slug: string }) =>
    okResponse(rows(body.p_group_category_slug, 3))
  );
});

describe('loadBrowseRails', () => {
  it('expõe tag e TTL', () => {
    expect(BROWSE_RAILS_TAG).toBe('browse-rails');
    expect(BROWSE_RAILS_CACHE_SECONDS).toBe(300);
  });

  it('monta o mesmo corpo do cliente por grupo, com p_order só quando configurado', async () => {
    const data = await loadBrowseRails({
      rails: [{ groups: ['eventos'] }, { groups: ['cinema'] }],
      cityIbge: '5103403',
      cityIbges: ['5103403', '5108402'],
      state: 'MT',
      orderByGroup: { eventos: 'event_start' },
    });

    const bodies = Object.fromEntries(
      pgrstRpc.mock.calls.map((c) => [c[1].p_group_category_slug, c[1]])
    );
    expect(bodies.eventos).toMatchObject({
      p_state: 'MT',
      p_city_ibge: '5103403',
      p_city_id: 5103403,
      p_city_ibges: ['5103403', '5108402'],
      p_page: 0,
      p_page_size: 12,
      p_order: 'expires_at:asc',
    });
    expect(bodies.cinema).not.toHaveProperty('p_order');
    expect(bodies.cinema).not.toHaveProperty('p_expired_grace');
    expect(data?.cityIbge).toBe('5103403');
    expect(data?.signature).toBe(JSON.stringify([{ groups: ['eventos'] }, { groups: ['cinema'] }]));
    expect(data?.rails).toHaveLength(2);
    expect(data?.rails[0].items).toHaveLength(3);
  });

  it('groupNames só traz os slugs usados', async () => {
    const data = await loadBrowseRails({ rails: [{ groups: ['eventos', 'cinema'] }], cityIbge: '1' });
    expect(data?.groupNames).toEqual({ eventos: 'Eventos', cinema: 'Cinema' });
    expect(serverFetchResource).toHaveBeenCalledWith(
      'categories_group',
      { active: 'true' },
      expect.objectContaining({ auth: null })
    );
  });

  it('trilha com vários grupos alterna os itens e marca hasMore pela página cheia', async () => {
    pgrstRpc.mockImplementation(async (_fn: string, body: { p_group_category_slug: string }) =>
      okResponse(rows(body.p_group_category_slug, body.p_group_category_slug === 'a' ? 12 : 2))
    );
    const data = await loadBrowseRails({ rails: [{ groups: ['a', 'b'] }], cityIbge: '1' });
    expect(data?.rails[0].items.map((i) => i.uid).slice(0, 3)).toEqual(['a-0', 'b-0', 'a-1']);
    expect(data?.rails[0].hasMore).toBe(true);
  });

  it('trilha vazia legítima não é erro', async () => {
    pgrstRpc.mockImplementation(async () => okResponse([]));
    const data = await loadBrowseRails({ rails: [{ groups: ['eventos'] }], cityIbge: '1' });
    expect(data?.rails[0].items).toEqual([]);
  });

  it('erro de RPC ou da taxonomia devolve null (não cacheia lista vazia)', async () => {
    pgrstRpc.mockResolvedValue(new Response('x', { status: 500 }));
    expect(await loadBrowseRails({ rails: [{ groups: ['eventos'] }], cityIbge: '1' })).toBeNull();

    pgrstRpc.mockImplementation(async () => okResponse([]));
    serverFetchResource.mockRejectedValue(new Error('rede'));
    expect(await loadBrowseRails({ rails: [{ groups: ['eventos'] }], cityIbge: '1' })).toBeNull();
  });

  it('sem trilhas ou sem cidade devolve null sem consultar', async () => {
    expect(await loadBrowseRails({ rails: [], cityIbge: '1' })).toBeNull();
    expect(await loadBrowseRails({ rails: [{ groups: ['a'] }], cityIbge: '' })).toBeNull();
    expect(pgrstRpc).not.toHaveBeenCalled();
  });
});
