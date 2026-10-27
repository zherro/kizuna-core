import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { encryptValue, generateAppEncryptionKey } from '../app-crypto';
import { revealAnalyticsIp } from './reveal-ip';

const KEY_ENV = 'APP_ENCRYPTION_KEY';
let saved: string | undefined;

beforeEach(() => {
  saved = process.env[KEY_ENV];
  process.env[KEY_ENV] = generateAppEncryptionKey();
});
afterEach(() => {
  if (saved === undefined) delete process.env[KEY_ENV];
  else process.env[KEY_ENV] = saved;
});

describe('revealAnalyticsIp', () => {
  it('ida e volta com encryptValue', () => {
    const token = encryptValue('analytics-ip', '187.12.45.9');
    expect(revealAnalyticsIp(token)).toBe('187.12.45.9');
  });

  it('token de outro propósito → null', () => {
    expect(revealAnalyticsIp(encryptValue('outro', '187.12.45.9'))).toBeNull();
  });

  it('lixo ou vazio → null', () => {
    expect(revealAnalyticsIp('lixo')).toBeNull();
    expect(revealAnalyticsIp('')).toBeNull();
  });

  it('chave trocada → null', () => {
    const token = encryptValue('analytics-ip', '187.12.45.9');
    process.env[KEY_ENV] = generateAppEncryptionKey();
    expect(revealAnalyticsIp(token)).toBeNull();
  });
});
