import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDeleteAccountHandler } from './delete-account-handler';
import { ServiceUnavailableError, type ServiceDb } from '../service-db';
import type { SessionPayload } from '../auth';

vi.mock('./delete-account', () => ({ deleteAccount: vi.fn(async () => {}) }));
import { deleteAccount } from './delete-account';

const NOW = new Date('2026-09-29T12:00:00Z');
const nowSec = NOW.getTime() / 1000;
const db = {} as ServiceDb;

const session: SessionPayload = {
  user_id: 'u1',
  tenant_id: 't1',
  login: 'a@b.com',
  iat: nowSec - 60,
};

function handle(s: SessionPayload | null, email: string) {
  const handler = createDeleteAccountHandler({ db, getSession: async () => s, now: () => NOW });
  return handler(
    new Request('http://x/api/account/delete', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  );
}

const codeOf = async (res: Response) => ((await res.json()) as { code?: string }).code;

beforeEach(() => {
  vi.mocked(deleteAccount).mockClear();
});

describe('POST /api/account/delete', () => {
  it('sem sessão → 401 unauthenticated', async () => {
    const res = await handle(null, 'a@b.com');
    expect(res.status).toBe(401);
    expect(await codeOf(res)).toBe('unauthenticated');
  });

  it('login com mais de 15 min → 401 reauth_required', async () => {
    const res = await handle({ ...session, iat: nowSec - 16 * 60 }, 'a@b.com');
    expect(res.status).toBe(401);
    expect(await codeOf(res)).toBe('reauth_required');
  });

  it('e-mail diferente do login → 400 email_mismatch', async () => {
    const res = await handle(session, 'outro@b.com');
    expect(res.status).toBe(400);
    expect(await codeOf(res)).toBe('email_mismatch');
  });

  it('root → 403 root_forbidden', async () => {
    const res = await handle({ ...session, is_root: true }, 'a@b.com');
    expect(res.status).toBe(403);
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it('ok (e-mail com espaços/caixa) → 200, exclui e expira o cookie', async () => {
    const res = await handle(session, ' A@B.com ');
    expect(res.status).toBe(200);
    expect(deleteAccount).toHaveBeenCalledWith(db, { userId: 'u1', login: 'a@b.com' }, NOW);
    expect(res.headers.get('set-cookie')).toMatch(/session=;.*Max-Age=0/i);
  });

  it('sem token de serviço → 503 service_unavailable', async () => {
    vi.mocked(deleteAccount).mockRejectedValueOnce(new ServiceUnavailableError());
    const res = await handle(session, 'a@b.com');
    expect(res.status).toBe(503);
    expect(await codeOf(res)).toBe('service_unavailable');
  });
});
