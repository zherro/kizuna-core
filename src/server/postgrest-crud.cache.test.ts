import { beforeEach, describe, expect, it, vi } from 'vitest';

const { resources, pgrstTable, unstableCache, revalidateTag } = vi.hoisted(() => ({
  resources: {} as Record<string, unknown>,
  pgrstTable: vi.fn(),
  // passa direto: o teste valida o que o código manda cachear, não o cache do Next
  unstableCache: vi.fn((fn: unknown) => fn),
  revalidateTag: vi.fn(),
}));

vi.mock('next/cache', () => ({ unstable_cache: unstableCache, revalidateTag }));
vi.mock('@/lib/server/resources', () => ({ postgrestResources: resources, postgrestRpcs: {} }));
vi.mock('./auth', () => ({
  getAuthHeaderFromCookies: vi.fn(async () => 'Bearer x'),
  getSession: vi.fn(async () => ({ userId: 'u', role: 'auth_user' })),
}));
vi.mock('./postrest/conn', () => ({ pgrstRpc: vi.fn(), pgrstTable }));

import { PUBLIC_LISTS_TAG, createResource, listResource } from './postgrest-crud';

const base = { table: 'categories', select: 'id,name', primaryKey: 'id', searchableColumns: [], defaultOrder: 'name' };

function pgOk(rows: unknown[], total = rows.length) {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-range': `0-${Math.max(total - 1, 0)}/${total}` }),
    json: async () => rows,
  };
}

const req = (qs = '') => new Request(`http://x/api/resources/r${qs}`);

beforeEach(() => {
  pgrstTable.mockReset();
  revalidateTag.mockReset();
  for (const k of Object.keys(resources)) delete resources[k];
});

describe('cache no servidor das listagens públicas', () => {
  it('listagem pública com publicCacheSeconds: consulta sem auth, devolve itens e Cache-Control', async () => {
    resources.cats = { ...base, listRequiresAuth: false, publicCacheSeconds: 300 };
    pgrstTable.mockResolvedValue(pgOk([{ id: 1, name: 'Cinema' }]));
    const res = await listResource('cats', req('?pageSize=10'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toEqual([{ id: 1, name: 'Cinema' }]);
    expect(body.total).toBe(1);
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=300');
    expect(pgrstTable).toHaveBeenCalledTimes(1);
    expect(pgrstTable.mock.calls[0][2]).toEqual({ auth: null });
    expect(unstableCache).toHaveBeenCalled();
  });

  it('recurso autenticado nunca entra no cache compartilhado', async () => {
    resources.priv = { ...base, listRequiresAuth: true, publicCacheSeconds: 300 };
    pgrstTable.mockResolvedValue(pgOk([{ id: 9, name: 'X' }]));
    unstableCache.mockClear();
    const res = await listResource('priv', req());
    expect(res.status).toBe(200);
    expect(unstableCache).not.toHaveBeenCalled();
    expect(pgrstTable.mock.calls[0][2]).toEqual({ auth: 'Bearer x' });
    expect(res.headers.get('Cache-Control')).toBeNull();
  });

  it('erro do PostgREST na listagem pública vira a resposta de erro (e não é cacheado)', async () => {
    resources.cats = { ...base, listRequiresAuth: false, publicCacheSeconds: 300 };
    pgrstTable.mockResolvedValue({
      ok: false,
      status: 503,
      headers: new Headers(),
      json: async () => ({ message: 'indisponível' }),
    });
    const res = await listResource('cats', req());
    expect(res.status).toBe(503);
    expect((await res.json()).message).toBe('indisponível');
  });

  it('gravar (create) invalida a tag das listagens públicas', async () => {
    resources.cats = { ...base, listRequiresAuth: false, publicCacheSeconds: 300 };
    pgrstTable.mockResolvedValue({
      ok: true,
      status: 201,
      headers: new Headers(),
      json: async () => [{ id: 2, name: 'Novo' }],
    });
    const res = await createResource(
      'cats',
      new Request('http://x/api/resources/cats', { method: 'POST', body: JSON.stringify({ name: 'Novo' }) })
    );
    expect(res.status).toBe(201);
    expect(revalidateTag).toHaveBeenCalledWith(PUBLIC_LISTS_TAG, { expire: 0 });
  });
});
