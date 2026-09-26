import jwt from 'jsonwebtoken';
import type { PermissionMap } from '../types/auth';
import { signSession } from './auth';

/** Sessão pública devolvida ao client (mesmo formato do login por senha e do /api/auth/me). */
export type IssuedSession = {
  token: string;
  user: {
    user_id: string;
    display_name: string;
    login: string;
    tenant_type?: string;
    perms?: PermissionMap;
    is_root?: boolean;
  };
};

/**
 * Assina a sessão a partir do jsonb de `auth.fun_auth__build_login_result` (login externo, OTP).
 * Retorna null se faltar usuário/tenant (conta bloqueada ou resposta inesperada).
 */
export function issueSessionFromLoginResult(
  data: Record<string, unknown> | null,
  opts: { login?: string; displayName: string }
): IssuedSession | null {
  const userId = data?.user_uid as string | undefined;
  const tenantId = data?.tenant_uid as string | undefined;
  if (!userId || !tenantId) return null;

  const login = opts.login ?? (data?.login as string | undefined) ?? '';
  const user = {
    user_id: userId,
    display_name: opts.displayName,
    login,
    tenant_type: data?.tenant_type as string | undefined,
    perms: data?.perms as PermissionMap | undefined,
    is_root: data?.is_root as boolean | undefined,
  };
  const token = signSession({ ...user, tenant_id: tenantId });
  return { token, user };
}

/** JWT curto (2 min) que autoriza só as RPCs que checam o claim `purpose` informado. */
export function purposeAuthHeader(purpose: string): string {
  const secret = process.env.PGRST_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('Missing JWT secret env (PGRST_JWT_SECRET ou JWT_SECRET).');
  const token = jwt.sign({ role: 'anon', purpose }, secret, {
    algorithm: 'HS256',
    expiresIn: '2m',
  });
  return `Bearer ${token}`;
}
