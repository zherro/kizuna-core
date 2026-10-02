import { serviceTable } from '../service-db';

/**
 * A sessão é um JWT de 7 dias: sozinha ela não "sabe" que a conta foi excluída ou bloqueada. Este
 * checker compara o `iat` do token com `auth.users.sessions_revoked_at` / `is_active`, com cache
 * por usuário (padrão 60 s) — no máximo 1 consulta por usuário por minuto, por instância.
 * Falha na consulta = fail-open: instabilidade do banco não desloga ninguém.
 */
export type UserStatus = { isActive: boolean; sessionsRevokedAt: string | null } | null;

type Options = {
  fetchStatus: (userId: string) => Promise<UserStatus>;
  ttlMs?: number;
  now?: () => number;
};

export function createSessionRevocationChecker({
  fetchStatus,
  ttlMs = 60_000,
  now = Date.now,
}: Options) {
  const cache = new Map<string, { at: number; status: UserStatus }>();
  // Uma página dispara várias requisições ao mesmo tempo: com o cache vazio, todas esperam a
  // mesma consulta em vez de cada uma ir ao banco.
  const inFlight = new Map<string, Promise<UserStatus | undefined>>();

  async function load(userId: string): Promise<UserStatus | undefined> {
    try {
      const status = await fetchStatus(userId);
      cache.set(userId, { at: now(), status });
      return status;
    } catch {
      return undefined;
    } finally {
      inFlight.delete(userId);
    }
  }

  /** `undefined` = não deu para consultar agora. */
  function statusOf(userId: string): Promise<UserStatus | undefined> {
    const hit = cache.get(userId);
    if (hit && now() - hit.at < ttlMs) return Promise.resolve(hit.status);
    let pending = inFlight.get(userId);
    if (!pending) {
      pending = load(userId);
      inFlight.set(userId, pending);
    }
    return pending;
  }

  return {
    async isRevoked(userId: string, issuedAtSec: number): Promise<boolean> {
      const status = await statusOf(userId);
      if (status === undefined) return false;
      if (status === null || !status.isActive) return true;
      if (!status.sessionsRevokedAt) return false;
      return issuedAtSec * 1000 < Date.parse(status.sessionsRevokedAt);
    },
  };
}

type UserStatusRow = { is_active: boolean | null; sessions_revoked_at: string | null };

export async function fetchUserStatusViaService(userId: string): Promise<UserStatus> {
  const res = await serviceTable(
    `/users?select=is_active,sessions_revoked_at&uid=eq.${userId}&limit=1`,
    { schema: 'auth' }
  );
  if (!res.ok) throw new Error(`users ${res.status}`);
  const [row] = (await res.json()) as UserStatusRow[];
  if (!row) return null;
  return { isActive: row.is_active === true, sessionsRevokedAt: row.sessions_revoked_at };
}
