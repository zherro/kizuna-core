import { describe, expect, it } from 'vitest';
import { validateGoogleClaims } from './google';
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
