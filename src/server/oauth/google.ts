import { createPublicKey, verify as cryptoVerify, type KeyObject } from 'node:crypto';
import type { OAuthProvider, OAuthProfile } from './types';

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com']);

function clientId(): string {
  return process.env.GOOGLE_CLIENT_ID || '';
}

function clientSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET || '';
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const part = token.split('.')[1];
  if (!part) throw new Error('google_invalid_id_token');
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as Record<string, unknown>;
}

/**
 * Valida as claims do id_token. A assinatura não é checada de propósito: o token veio direto do
 * endpoint de token do Google, por TLS, autenticado com o client_secret (OIDC Core §3.1.3.7 —
 * nesse caso a validação por TLS substitui a da assinatura). iss/aud/exp/nonce continuam
 * obrigatórios.
 */
export function validateGoogleClaims(
  claims: Record<string, unknown>,
  expected: { clientId: string; nonce: string; nowSec?: number }
): OAuthProfile {
  const now = expected.nowSec ?? Math.floor(Date.now() / 1000);
  if (!ISSUERS.has(String(claims.iss))) throw new Error('google_invalid_iss');
  const aud = claims.aud;
  const audOk = Array.isArray(aud) ? aud.includes(expected.clientId) : aud === expected.clientId;
  if (!audOk) throw new Error('google_invalid_aud');
  if (typeof claims.exp !== 'number' || claims.exp < now) throw new Error('google_expired');
  if (claims.nonce !== expected.nonce) throw new Error('google_invalid_nonce');
  if (typeof claims.sub !== 'string' || !claims.sub) throw new Error('google_missing_sub');

  const email = typeof claims.email === 'string' ? claims.email.trim().toLowerCase() : null;
  return {
    subject: claims.sub,
    email: email || null,
    emailVerified: claims.email_verified === true || claims.email_verified === 'true',
    name: typeof claims.name === 'string' ? claims.name : null,
    picture: typeof claims.picture === 'string' ? claims.picture : null,
  };
}

let jwksCache: { keys: Map<string, KeyObject>; expiresAt: number } | null = null;

async function fetchGoogleKeys(): Promise<Map<string, KeyObject>> {
  const res = await fetch(JWKS_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`google_jwks_failed:${res.status}`);
  const json = (await res.json()) as { keys?: Array<Record<string, unknown>> };
  const keys = new Map<string, KeyObject>();
  for (const jwk of json.keys ?? []) {
    if (typeof jwk.kid !== 'string') continue;
    keys.set(jwk.kid, createPublicKey({ key: jwk as never, format: 'jwk' }));
  }
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get('cache-control') ?? '')?.[1] ?? 3600);
  jwksCache = { keys, expiresAt: Date.now() + maxAge * 1000 };
  return keys;
}

/** Chave pública do Google pelo `kid`. Cache pelo max-age; `kid` desconhecido força 1 refetch (rotação). */
async function googleKey(kid: string): Promise<KeyObject> {
  const cached = jwksCache && jwksCache.expiresAt > Date.now() ? jwksCache.keys.get(kid) : undefined;
  if (cached) return cached;
  const key = (await fetchGoogleKeys()).get(kid);
  if (!key) throw new Error('google_unknown_kid');
  return key;
}

/**
 * Valida um id_token que chegou pelo navegador (Google One Tap). Aqui a assinatura RS256 É
 * checada contra as chaves públicas do Google — o token não veio do endpoint de token por TLS.
 */
export async function verifyGoogleIdToken(
  idToken: string,
  expected: { clientId: string; nonce: string; nowSec?: number }
): Promise<OAuthProfile> {
  const [h, p, sig] = idToken.split('.');
  if (!h || !p || !sig) throw new Error('google_invalid_id_token');
  let header: Record<string, unknown>;
  try {
    header = JSON.parse(Buffer.from(h, 'base64url').toString('utf8')) as Record<string, unknown>;
  } catch {
    throw new Error('google_invalid_id_token');
  }
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') {
    throw new Error('google_invalid_id_token');
  }
  const key = await googleKey(header.kid);
  const ok = cryptoVerify('RSA-SHA256', Buffer.from(`${h}.${p}`), key, Buffer.from(sig, 'base64url'));
  if (!ok) throw new Error('google_invalid_signature');
  return validateGoogleClaims(decodeJwtPayload(idToken), expected);
}

export const googleProvider: OAuthProvider = {
  id: 'google',
  label: 'Google',

  isEnabled() {
    return Boolean(clientId() && clientSecret());
  },

  oneTapClientId() {
    // GOOGLE_ONE_TAP=false desliga só o balão; o botão continua.
    return process.env.GOOGLE_ONE_TAP === 'false' ? null : clientId();
  },

  verifyIdToken(idToken, { nonce }) {
    return verifyGoogleIdToken(idToken, { clientId: clientId(), nonce });
  },

  authorizeUrl({ redirectUri, state, codeChallenge, nonce }) {
    const params = new URLSearchParams({
      client_id: clientId(),
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      prompt: 'select_account',
    });
    return `${AUTHORIZE_URL}?${params.toString()}`;
  },

  async exchange({ code, redirectUri, codeVerifier, nonce }) {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId(),
        client_secret: clientSecret(),
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
      }).toString(),
      cache: 'no-store',
    });
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok || typeof json?.id_token !== 'string') {
      throw new Error(`google_token_exchange_failed:${res.status}:${String(json?.error ?? '')}`);
    }
    return validateGoogleClaims(decodeJwtPayload(json.id_token), { clientId: clientId(), nonce });
  },
};
