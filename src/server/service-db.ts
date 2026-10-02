import { getServiceAuthHeader } from './auth';
import { pgrstRpc, pgrstTable } from './postrest/conn';

/**
 * Acesso ao PostgREST como `service_role` (sql/0117: BYPASSRLS + GRANTs mínimos). Só para
 * operações do servidor que a sessão do usuário não pode fazer (excluir conta, abrir ticket do
 * sistema, checar revogação de sessão). Sem POSTGREST_SERVICE_TOKEN lança
 * `ServiceUnavailableError`: quem chama decide se isso vira 503 ou no-op.
 */
export class ServiceUnavailableError extends Error {
  constructor() {
    super('POSTGREST_SERVICE_TOKEN não configurado (rode: kizuna token service).');
    this.name = 'ServiceUnavailableError';
  }
}

type Schema = 'auth' | 'public';

function requireServiceAuth(): string {
  const auth = getServiceAuthHeader();
  if (!auth) throw new ServiceUnavailableError();
  return auth;
}

export function hasServiceAccess(): boolean {
  return getServiceAuthHeader() !== null;
}

export async function serviceTable(
  path: string,
  init: RequestInit & { schema?: Schema } = {}
): Promise<Response> {
  const auth = requireServiceAuth();
  const { schema = 'public', headers, ...rest } = init;
  const merged = new Headers(headers);
  merged.set('Accept-Profile', schema);
  merged.set('Content-Profile', schema);
  return pgrstTable(path, { ...rest, headers: merged }, { auth });
}

export async function serviceRpc(
  name: string,
  body: unknown,
  schema: Schema = 'public'
): Promise<Response> {
  return pgrstRpc(name, body, { auth: requireServiceAuth(), schema });
}

export type ServiceDb = { table: typeof serviceTable; rpc: typeof serviceRpc };

export const serviceDb: ServiceDb = { table: serviceTable, rpc: serviceRpc };
