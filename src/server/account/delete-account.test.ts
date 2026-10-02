import { describe, expect, it, vi } from 'vitest';
import { deleteAccount } from './delete-account';
import type { ServiceDb } from '../service-db';

type Call = { path: string; method: string; body?: unknown };

function fakeDb(tenants: string[] = ['t1']) {
  const calls: Call[] = [];
  const table = vi.fn(async (path: string, init: RequestInit = {}) => {
    const method = (init.method ?? 'GET').toUpperCase();
    calls.push({ path, method, body: init.body ? JSON.parse(String(init.body)) : undefined });
    if (method === 'GET' && path.startsWith('/tenants')) {
      return new Response(JSON.stringify(tenants.map((uid) => ({ uid }))), { status: 200 });
    }
    return new Response(null, { status: 204 });
  });
  return { db: { table, rpc: vi.fn() } as unknown as ServiceDb, table, calls };
}

const NOW = new Date('2026-09-29T12:00:00Z');
const input = { userId: 'u1', login: 'a@b.com' };

describe('deleteAccount', () => {
  it('desativa anúncios, remove login social e por último marca a conta', async () => {
    const { db, calls } = fakeDb(['t1', 't2']);
    await deleteAccount(db, input, NOW);

    expect(calls.map((c) => `${c.method} ${c.path.split('?')[0]}`)).toEqual([
      'GET /tenants',
      'PATCH /services',
      'DELETE /user_identities',
      'PATCH /users',
    ]);
    expect(calls[1].path).toContain('tenant_id=in.(t1,t2)');
    expect(calls[3].body).toEqual({
      deleted_login: 'a@b.com',
      login: 'deleted:u1:a@b.com',
      is_active: false,
      deleted_at: NOW.toISOString(),
      phone: null,
      sessions_revoked_at: NOW.toISOString(),
    });
  });

  it('sem tenant: pula a desativação de anúncios', async () => {
    const { db, calls } = fakeDb([]);
    await deleteAccount(db, input, NOW);
    expect(calls.some((c) => c.path.startsWith('/services'))).toBe(false);
  });

  it('plugin services ausente (404): segue adiante', async () => {
    const { db, table, calls } = fakeDb();
    table.mockImplementation(async (path: string, init: RequestInit = {}) => {
      const method = (init.method ?? 'GET').toUpperCase();
      calls.push({ path, method });
      if (path.startsWith('/tenants')) return new Response('[{"uid":"t1"}]', { status: 200 });
      if (path.startsWith('/services')) return new Response('{}', { status: 404 });
      return new Response(null, { status: 204 });
    });
    await deleteAccount(db, input, NOW);
    expect(calls.some((c) => c.path.startsWith('/users'))).toBe(true);
  });

  it('falha num passo: lança e não marca a conta', async () => {
    const { db, table, calls } = fakeDb();
    table.mockImplementationOnce(async (path: string) => {
      calls.push({ path, method: 'GET' });
      return new Response('[]', { status: 500 });
    });
    await expect(deleteAccount(db, input, NOW)).rejects.toThrow(/tenants/);
    expect(calls.some((c) => c.path.startsWith('/users'))).toBe(false);
  });
});
