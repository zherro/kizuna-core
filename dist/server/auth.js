import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
export const SESSION_COOKIE_NAME = 'session';
function getJwtSecret() {
    const secret = process.env.PGRST_JWT_SECRET || process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('Missing JWT secret env (PGRST_JWT_SECRET ou JWT_SECRET).');
    }
    return secret;
}
export function signSession(payload, expiresIn = '7d') {
    if (!payload?.tenant_id) {
        throw new Error('Missing tenant_id in session payload.');
    }
    const withRole = { ...payload, role: 'auth_user' };
    const signOptions = {
        algorithm: 'HS256',
        expiresIn,
    };
    return jwt.sign(withRole, getJwtSecret(), signOptions);
}
export function verifySession(token) {
    try {
        return jwt.verify(token, getJwtSecret());
    }
    catch {
        return null;
    }
}
export async function getTokenFromCookies() {
    const ck = await cookies();
    return ck.get(SESSION_COOKIE_NAME)?.value ?? null;
}
export async function getAuthHeaderFromCookies() {
    const token = await getTokenFromCookies();
    return token ? `Bearer ${token}` : null;
}
export function getServiceAuthHeader() {
    const token = process.env.POSTGREST_SERVICE_TOKEN || process.env.POSTGREST_SERVICE_JWT || null;
    return token ? `Bearer ${token}` : null;
}
export async function getSession() {
    const token = await getTokenFromCookies();
    return token ? verifySession(token) : null;
}
export function maskEmail(email) {
    const [local, domain] = email.split('@');
    if (!local || !domain)
        return 'invalid-email';
    const visible = local.slice(0, 2);
    return `${visible}***@${domain}`;
}
export function getDisplayNameFromEmail(email) {
    const localPart = email.split('@')[0] ?? 'Usuario';
    const normalized = localPart.replace(/[._-]+/g, ' ').trim();
    if (!normalized)
        return 'Usuario';
    return normalized
        .split(' ')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}
export function isValidEmail(email) {
    return /^\S+@\S+\.\S+$/.test(email);
}
export function getDisplayName(name, email) {
    if (name.trim())
        return name.trim();
    const localPart = email.split('@')[0] ?? 'Usuario';
    return localPart
        .replace(/[._-]+/g, ' ')
        .trim()
        .split(' ')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}
export function isConfigError(message) {
    return message.includes('Missing JWT secret env');
}
//# sourceMappingURL=auth.js.map