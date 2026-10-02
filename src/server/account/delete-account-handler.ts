import { NextResponse } from 'next/server';
import { getSession, SESSION_COOKIE_NAME, type SessionPayload } from '../auth';
import { serviceDb, ServiceUnavailableError, type ServiceDb } from '../service-db';
import { deleteAccount } from './delete-account';

/** Login precisa ter no máximo 15 min para excluir a conta (confirmação sem senha). */
export const RECENT_LOGIN_MAX_AGE_SEC = 15 * 60;

type Deps = {
  db?: ServiceDb;
  getSession?: () => Promise<SessionPayload | null>;
  now?: () => Date;
};

const fail = (status: number, code: string) => NextResponse.json({ code }, { status });

const normalizeEmail = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase();

/**
 * `POST /api/account/delete` `{ email }` — o próprio usuário exclui a conta. Confirma digitando o
 * e-mail e exige login recente (serve também para quem só entra com Google, sem senha).
 */
export function createDeleteAccountHandler(deps: Deps = {}) {
  const db = deps.db ?? serviceDb;
  const readSession = deps.getSession ?? getSession;
  const now = deps.now ?? (() => new Date());

  return async function handleDeleteAccount(request: Request): Promise<Response> {
    const session = await readSession();
    if (!session?.login) return fail(401, 'unauthenticated');
    if (session.is_root) return fail(403, 'root_forbidden');

    const ageSec = now().getTime() / 1000 - (session.iat ?? 0);
    if (ageSec > RECENT_LOGIN_MAX_AGE_SEC) return fail(401, 'reauth_required');

    const body = (await request.json().catch(() => ({}))) as { email?: unknown };
    if (normalizeEmail(body.email) !== normalizeEmail(session.login)) {
      return fail(400, 'email_mismatch');
    }

    try {
      await deleteAccount(db, { userId: session.user_id, login: session.login }, now());
    } catch (error) {
      if (error instanceof ServiceUnavailableError) return fail(503, 'service_unavailable');
      console.error('[account.delete] failed', { userId: session.user_id, error: String(error) });
      return fail(500, 'delete_failed');
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set({ name: SESSION_COOKIE_NAME, value: '', path: '/', maxAge: 0 });
    return response;
  };
}
