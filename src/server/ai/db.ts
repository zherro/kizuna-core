/**
 * Acesso ao PostgREST da revisão por IA: SEMPRE com o JWT do usuário logado (root), nunca com o
 * token de serviço. Quem chama (rota) lê o token da sessão e o repassa em `AiUserDb`; assim as
 * funções de IA não dependem de cookie nem de env, e a RLS/RPCs do banco decidem o acesso.
 */

import { pgrstRpc, pgrstTable } from '../postrest/conn';

export interface AiUserDb {
  /** JWT da sessão do usuário (sem o prefixo `Bearer`). */
  accessToken: string;
}

function bearer(db: AiUserDb): string {
  return `Bearer ${db.accessToken}`;
}

export function aiTable(db: AiUserDb, path: string, init?: RequestInit): Promise<Response> {
  return pgrstTable(path, init, { auth: bearer(db) });
}

export function aiRpc(db: AiUserDb, name: string, body: unknown): Promise<Response> {
  return pgrstRpc(name, body, { auth: bearer(db) });
}
