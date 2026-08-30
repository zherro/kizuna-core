import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import type { PermissionMap } from '../types/auth';

export const SESSION_COOKIE_NAME = 'session';

export type SessionPayload = {
  user_id: string;
  tenant_id: string;
  tenant_type?: string;
  perms?: PermissionMap;
  role?: string;
  login?: string;
  display_name?: string;
};

function getJwtSecret(): string {
  const secret = process.env.PGRST_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Missing JWT secret env (PGRST_JWT_SECRET ou JWT_SECRET).');
  }
  return secret;
}

export function signSession(
  payload: SessionPayload,
  expiresIn: SignOptions['expiresIn'] = '7d'
): string {
  if (!payload?.tenant_id) {
    throw new Error('Missing tenant_id in session payload.');
  }

  const withRole: SessionPayload = { ...payload, role: 'auth_user' };
  const signOptions: SignOptions = {
    algorithm: 'HS256',
    expiresIn,
  };

  return jwt.sign(withRole, getJwtSecret(), signOptions);
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as SessionPayload;
  } catch {
    return null;
  }
}

export async function getTokenFromCookies(): Promise<string | null> {
  const ck = await cookies();
  return ck.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function getAuthHeaderFromCookies(): Promise<string | null> {
  const token = await getTokenFromCookies();
  return token ? `Bearer ${token}` : null;
}

export function getServiceAuthHeader(): string | null {
  const token = process.env.POSTGREST_SERVICE_TOKEN || process.env.POSTGREST_SERVICE_JWT || null;

  return token ? `Bearer ${token}` : null;
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = await getTokenFromCookies();
  return token ? verifySession(token) : null;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return 'invalid-email';
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

export function getDisplayNameFromEmail(email: string): string {
  const localPart = email.split('@')[0] ?? 'Usuario';
  const normalized = localPart.replace(/[._-]+/g, ' ').trim();
  if (!normalized) return 'Usuario';
  return normalized
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function isValidEmail(email: string): boolean {
  return /^\S+@\S+\.\S+$/.test(email);
}

export function getDisplayName(name: string, email: string): string {
  if (name.trim()) return name.trim();
  const localPart = email.split('@')[0] ?? 'Usuario';
  return localPart
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function isConfigError(message: string): boolean {
  return message.includes('Missing JWT secret env');
}
