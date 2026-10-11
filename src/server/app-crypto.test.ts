import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateAppEncryptionKey, openToken, sealToken } from './app-crypto';

describe('app-crypto', () => {
  beforeEach(() => {
    vi.stubEnv('APP_ENCRYPTION_KEY', '');
    vi.stubEnv('PGRST_JWT_SECRET', 'segredo-de-teste-com-tamanho-suficiente');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('sela e abre (chave derivada do JWT secret)', () => {
    const token = sealToken('email-verify', { u: 'user-1', c: '123456' }, 60);
    expect(token).not.toContain('123456');
    expect(openToken('email-verify', token)).toEqual({ u: 'user-1', c: '123456' });
  });

  it('usa APP_ENCRYPTION_KEY quando existe (outra chave não abre)', () => {
    vi.stubEnv('APP_ENCRYPTION_KEY', generateAppEncryptionKey());
    const token = sealToken('p', 1, 60);
    expect(openToken('p', token)).toBe(1);
    vi.stubEnv('APP_ENCRYPTION_KEY', generateAppEncryptionKey());
    expect(openToken('p', token)).toBeNull();
  });

  it('recusa outro propósito, adulteração e lixo', () => {
    const token = sealToken('email-verify', 'x', 60);
    expect(openToken('password-reset', token)).toBeNull();
    const parts = token.split('.');
    parts[2] = parts[2].slice(0, -2) + (parts[2].endsWith('A') ? 'BB' : 'AA');
    expect(openToken('email-verify', parts.join('.'))).toBeNull();
    expect(openToken('email-verify', 'nao-e-token')).toBeNull();
  });

  it('recusa token vencido', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const token = sealToken('p', 'x', 60);
    vi.setSystemTime(new Date('2026-01-01T00:02:00Z'));
    expect(openToken('p', token)).toBeNull();
  });

  it('APP_ENCRYPTION_KEY de tamanho errado é erro claro', () => {
    vi.stubEnv('APP_ENCRYPTION_KEY', 'curta');
    expect(() => sealToken('p', 1, 60)).toThrow('APP_ENCRYPTION_KEY');
  });
});
