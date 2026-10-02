import { serviceDb, type ServiceDb } from '../service-db';

type DeletedAccount = { uid: string; deleted_at: string };

export type RecreationReport = 'none' | 'reported' | 'plugin_missing';

/**
 * Cadastro novo com o login de uma conta excluída (`auth.users.deleted_login`, sql/0117) → abre um
 * ticket 'account_recreated' (plugin tickets) e avisa cada root via `auth.fun_notify`.
 */
export async function reportAccountRecreation(
  db: ServiceDb,
  { login, newUserId }: { login: string; newUserId: string }
): Promise<RecreationReport> {
  const deleted = await readJson<DeletedAccount[]>(
    await db.table(
      `/users?select=uid,deleted_at&deleted_login=eq.${encodeURIComponent(login)}` +
        '&deleted_at=not.is.null&order=deleted_at.desc',
      { schema: 'auth' }
    )
  );
  if (deleted.length === 0) return 'none';

  const [latest] = deleted;
  const title = `Conta recriada: ${login}`;
  const ticketRes = await db.table('/tickets?select=uid', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      type: 'account_recreated',
      title,
      created_by: null,
      subject_user_id: newUserId,
      related_user_id: latest.uid,
      payload: { login, deletedAt: latest.deleted_at, previousDeletions: deleted.length },
    }),
  });
  if (ticketRes.status === 404) return 'plugin_missing';
  const [ticket] = await readJson<{ uid: string }[]>(ticketRes);

  const roots = await readJson<{ uid: string }[]>(
    await db.table('/users?select=uid&is_root=is.true&is_active=is.true&deleted_at=is.null', {
      schema: 'auth',
    })
  );
  for (const root of roots) {
    await db.rpc(
      'fun_notify',
      {
        p_user_id: root.uid,
        p_type: 'ticket.account_recreated',
        p_title: title,
        p_body: null,
        p_context_type: 'ticket',
        p_context_id: ticket.uid,
      },
      'auth'
    );
  }
  return 'reported';
}

/** Para os handlers de cadastro: nunca lança — o cadastro não depende do alerta. */
export async function safeReportAccountRecreation(input: {
  login: string;
  newUserId: string;
}): Promise<RecreationReport> {
  try {
    return await reportAccountRecreation(serviceDb, input);
  } catch (error) {
    console.error('[account.recreation] report_failed', { error: String(error) });
    return 'none';
  }
}

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`PostgREST ${res.status}`);
  return (await res.json()) as T;
}
