import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  decryptValue,
  encryptValue,
  generateAppEncryptionKey,
  hmacValue,
  openToken,
  sealToken,
} from './app-crypto';

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

  describe('encryptValue / decryptValue', () => {
    it('cifra e decifra o texto', () => {
      const token = encryptValue('ip', '187.12.45.9');
      expect(token).not.toContain('187.12.45.9');
      expect(decryptValue('ip', token)).toBe('187.12.45.9');
    });

    it('duas cifras do mesmo valor diferem (IV aleatório)', () => {
      expect(encryptValue('ip', '187.12.45.9')).not.toBe(encryptValue('ip', '187.12.45.9'));
    });

    it('outro propósito, adulteração e lixo devolvem null', () => {
      const token = encryptValue('ip', '187.12.45.9');
      expect(decryptValue('outro', token)).toBeNull();
      const parts = token.split('.');
      parts[2] = parts[2].slice(0, -2) + (parts[2].endsWith('A') ? 'BB' : 'AA');
      expect(decryptValue('ip', parts.join('.'))).toBeNull();
      expect(decryptValue('ip', 'nao-e-token')).toBeNull();
    });

    it('tag truncada (< 16 bytes) devolve null', () => {
      const parts = encryptValue('ip', '187.12.45.9').split('.');
      const tag = Buffer.from(parts[3], 'base64url');
      expect(tag.length).toBe(16);
      parts[3] = tag.subarray(0, 8).toString('base64url');
      expect(decryptValue('ip', parts.join('.'))).toBeNull();
    });

    it('IV e tag adulterados devolvem null', () => {
      const parts = encryptValue('ip', '187.12.45.9').split('.');
      const flip = (b64: string) => {
        const buf = Buffer.from(b64, 'base64url');
        buf[0] ^= 1;
        return buf.toString('base64url');
      };
      expect(decryptValue('ip', [parts[0], flip(parts[1]), parts[2], parts[3]].join('.'))).toBeNull();
      expect(decryptValue('ip', [parts[0], parts[1], parts[2], flip(parts[3])].join('.'))).toBeNull();
    });

    it('token de sealToken não abre em decryptValue e vice-versa (mesmo propósito)', () => {
      expect(decryptValue('ip', sealToken('ip', '187.12.45.9', 60))).toBeNull();
      expect(openToken('ip', encryptValue('ip', '187.12.45.9'))).toBeNull();
    });

    it('não vence com o tempo e outra chave não abre', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      vi.stubEnv('APP_ENCRYPTION_KEY', generateAppEncryptionKey());
      const token = encryptValue('ip', 'x');
      vi.setSystemTime(new Date('2036-01-01T00:00:00Z'));
      expect(decryptValue('ip', token)).toBe('x');
      vi.stubEnv('APP_ENCRYPTION_KEY', generateAppEncryptionKey());
      expect(decryptValue('ip', token)).toBeNull();
    });
  });

  describe('hmacValue', () => {
    it('é determinístico, hex de 64 caracteres', () => {
      const a = hmacValue('ip', 'a');
      expect(a).toBe(hmacValue('ip', 'a'));
      expect(a).toMatch(/^[0-9a-f]{64}$/);
    });

    it('muda com o valor e com o propósito', () => {
      expect(hmacValue('ip', 'a')).not.toBe(hmacValue('ip', 'b'));
      expect(hmacValue('ip', 'a')).not.toBe(hmacValue('outro', 'a'));
    });

    it('muda com a chave do app', () => {
      const before = hmacValue('ip', 'a');
      vi.stubEnv('APP_ENCRYPTION_KEY', generateAppEncryptionKey());
      expect(hmacValue('ip', 'a')).not.toBe(before);
    });
  });
});
