import { generateKeyPairSync, sign } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { validateGoogleClaims, verifyGoogleIdToken } from './google';
import { sanitizeReturnTo } from '../app-url';

const base = {
  iss: 'https://accounts.google.com',
  aud: 'client-123',
  exp: 2_000,
  nonce: 'n-1',
  sub: '1098765',
  email: 'Joao@Gmail.com',
  email_verified: true,
  name: 'João Silva',
  picture: 'https://lh3.googleusercontent.com/a/x',
};
const expected = { clientId: 'client-123', nonce: 'n-1', nowSec: 1_000 };

describe('validateGoogleClaims', () => {
  it('normaliza o perfil', () => {
    expect(validateGoogleClaims(base, expected)).toEqual({
      subject: '1098765',
      email: 'joao@gmail.com',
      emailVerified: true,
      name: 'João Silva',
      picture: 'https://lh3.googleusercontent.com/a/x',
    });
  });

  it.each([
    ['iss', { iss: 'https://evil.example' }, 'google_invalid_iss'],
    ['aud', { aud: 'outro-client' }, 'google_invalid_aud'],
    ['exp', { exp: 999 }, 'google_expired'],
    ['nonce', { nonce: 'n-2' }, 'google_invalid_nonce'],
    ['sub', { sub: '' }, 'google_missing_sub'],
  ])('recusa %s inválido', (_label, patch, message) => {
    expect(() => validateGoogleClaims({ ...base, ...patch }, expected)).toThrow(message);
  });

  it('email_verified ausente conta como não verificado', () => {
    const { email_verified: _omit, ...rest } = base;
    expect(validateGoogleClaims(rest, expected).emailVerified).toBe(false);
  });
});

describe('sanitizeReturnTo', () => {
  it.each([
    ['/descobrir?x=1', '/descobrir?x=1'],
    ['//evil.com', '/'],
    ['/\\evil.com', '/'],
    ['https://evil.com', '/'],
    ['javascript:alert(1)', '/'],
    ['/a\nb', '/'],
    [null, '/'],
  ])('%s → %s', (input, out) => {
    expect(sanitizeReturnTo(input as string | null)).toBe(out);
  });
});

describe('verifyGoogleIdToken (One Tap)', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const other = generateKeyPairSync('rsa', { modulusLength: 2048 });
  let kidSeq = 0;

  function mockJwks(kid: string) {
    const jwk = { ...publicKey.export({ format: 'jwk' }), kid, alg: 'RS256', use: 'sig' };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ keys: [jwk] }), { status: 200 }))
    );
  }

  function makeToken(kid: string, claims: Record<string, unknown>, key = privateKey) {
    const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const body = `${enc({ alg: 'RS256', kid, typ: 'JWT' })}.${enc(claims)}`;
    return `${body}.${sign('RSA-SHA256', Buffer.from(body), key).toString('base64url')}`;
  }

  afterEach(() => vi.unstubAllGlobals());

  it('aceita token assinado pela chave do Google', async () => {
    const kid = `k${++kidSeq}`;
    mockJwks(kid);
    const profile = await verifyGoogleIdToken(makeToken(kid, base), expected);
    expect(profile.subject).toBe('1098765');
  });

  it('recusa assinatura de outra chave', async () => {
    const kid = `k${++kidSeq}`;
    mockJwks(kid);
    await expect(
      verifyGoogleIdToken(makeToken(kid, base, other.privateKey), expected)
    ).rejects.toThrow('google_invalid_signature');
  });

  it('recusa kid desconhecido', async () => {
    mockJwks(`k${++kidSeq}`);
    await expect(verifyGoogleIdToken(makeToken('nao-existe', base), expected)).rejects.toThrow(
      'google_unknown_kid'
    );
  });

  it('continua checando nonce', async () => {
    const kid = `k${++kidSeq}`;
    mockJwks(kid);
    await expect(
      verifyGoogleIdToken(makeToken(kid, { ...base, nonce: 'outro' }), expected)
    ).rejects.toThrow('google_invalid_nonce');
  });
});
