import type { OAuthProvider, OAuthProfile } from './types';

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
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

export const googleProvider: OAuthProvider = {
  id: 'google',
  label: 'Google',

  isEnabled() {
    return Boolean(clientId() && clientSecret());
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
