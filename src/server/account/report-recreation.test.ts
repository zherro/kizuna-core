import { describe, expect, it, vi } from 'vitest';
import { reportAccountRecreation } from './report-recreation';
import type { ServiceDb } from '../service-db';

type Reply = { status?: number; body?: unknown };
type Call = { path: string; method: string; body?: unknown };

/** Rotas por "MÉTODO /tabela" (+ "#roots" para a busca de roots). */
function fakeDb(routes: Record<string, Reply>) {
  const calls: Call[] = [];
  const reply = (key: string) => {
    const r = routes[key] ?? { body: [] };
    const body = r.body === undefined ? null : JSON.stringify(r.body);
    return new Response(body, { status: r.status ?? 200 });
  };
  const table = vi.fn(async (path: string, init: RequestInit = {}) => {
    const method = (init.method ?? 'GET').toUpperCase();
    calls.push({ path, method, body: init.body ? JSON.parse(String(init.body)) : undefined });
    const suffix = path.includes('is_root') ? '#roots' : '';
    return reply(`${method} ${path.split('?')[0]}${suffix}`);
  });
  const rpc = vi.fn(async (name: string, body: unknown) => {
    calls.push({ path: name, method: 'RPC', body });
    return new Response(null, { status: 204 });
  });
  return { db: { table, rpc } as unknown as ServiceDb, calls };
}

const input = { login: 'a@b.com', newUserId: 'new' };

describe('reportAccountRecreation', () => {
  it('sem conta excluída com esse login → none, não abre ticket', async () => {
    const { db, calls } = fakeDb({ 'GET /users': { body: [] } });
    expect(await reportAccountRecreation(db, input)).toBe('none');
    expect(calls.some((c) => c.path.startsWith('/tickets'))).toBe(false);
  });

  it('achou → abre ticket account_recreated e avisa cada root', async () => {
    const { db, calls } = fakeDb({
      'GET /users': {
        body: [
          { uid: 'old2', deleted_at: '2026-09-20T00:00:00Z' },
          { uid: 'old1', deleted_at: '2026-01-01T00:00:00Z' },
        ],
      },
      'POST /tickets': { status: 201, body: [{ uid: 'tk1' }] },
      'GET /users#roots': { body: [{ uid: 'r1' }, { uid: 'r2' }] },
    });

    expect(await reportAccountRecreation(db, input)).toBe('reported');

    const ticket = calls.find((c) => c.method === 'POST');
    expect(ticket?.body).toMatchObject({
      type: 'account_recreated',
      created_by: null,
      subject_user_id: 'new',
      related_user_id: 'old2',
      payload: { login: 'a@b.com', deletedAt: '2026-09-20T00:00:00Z', previousDeletions: 2 },
    });
    const notifies = calls.filter((c) => c.method === 'RPC');
    expect(notifies.map((n) => (n.body as { p_user_id: string }).p_user_id)).toEqual(['r1', 'r2']);
    expect(notifies[0].body).toMatchObject({ p_context_type: 'ticket', p_context_id: 'tk1' });
  });

  it('plugin tickets ausente (404) → plugin_missing, sem avisos', async () => {
    const { db, calls } = fakeDb({
      'GET /users': { body: [{ uid: 'old', deleted_at: '2026-09-20T00:00:00Z' }] },
      'POST /tickets': { status: 404, body: { message: 'not found' } },
    });
    expect(await reportAccountRecreation(db, input)).toBe('plugin_missing');
    expect(calls.some((c) => c.method === 'RPC')).toBe(false);
  });
});
