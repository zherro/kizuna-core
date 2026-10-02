import type { ServiceDb } from '../service-db';

/**
 * Exclui a conta do usuário (lógico), liberando o e-mail para um novo cadastro. Passos em ordem e
 * idempotentes; o tombstone do login é o ÚLTIMO — se algo antes falhar, a conta segue intacta e a
 * operação pode ser repetida. Os dados da conta (perfil, avaliações, agenda...) ficam guardados.
 */
export async function deleteAccount(
  db: ServiceDb,
  input: { userId: string; login: string },
  now: Date = new Date()
): Promise<void> {
  const { userId, login } = input;
  const at = now.toISOString();

  const tenants = await readJson<{ uid: string }[]>(
    await db.table(`/tenants?select=uid&owner_uid=eq.${userId}`, { schema: 'auth' }),
    'tenants'
  );

  if (tenants.length > 0) {
    const ids = tenants.map((t) => t.uid).join(',');
    const res = await db.table(`/services?tenant_id=in.(${ids})`, {
      method: 'PATCH',
      body: JSON.stringify({ active: false }),
    });
    // 404 = plugin services não instalado: não há anúncio a desativar.
    if (res.status !== 404) ensureOk(res, 'services');
  }

  ensureOk(
    await db.table(`/user_identities?user_uid=eq.${userId}`, { method: 'DELETE', schema: 'auth' }),
    'user_identities'
  );

  ensureOk(
    await db.table(`/users?uid=eq.${userId}`, {
      method: 'PATCH',
      schema: 'auth',
      body: JSON.stringify({
        deleted_login: login,
        login: `deleted:${userId}:${login}`,
        is_active: false,
        deleted_at: at,
        phone: null,
        sessions_revoked_at: at,
      }),
    }),
    'users'
  );
}

function ensureOk(res: Response, step: string): void {
  if (!res.ok) throw new Error(`deleteAccount: ${step} falhou (${res.status})`);
}

async function readJson<T>(res: Response, step: string): Promise<T> {
  ensureOk(res, step);
  return (await res.json()) as T;
}
