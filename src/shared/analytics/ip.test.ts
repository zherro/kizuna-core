import { describe, it, expect } from 'vitest';
import { normalizeIp, isPublicIp, maskIp } from './ip';

describe('normalizeIp', () => {
  it('pega o primeiro salto da lista', () => {
    expect(normalizeIp('187.12.45.9, 10.0.0.1')).toBe('187.12.45.9');
  });
  it('remove o prefixo de IPv4 mapeado', () => {
    expect(normalizeIp('::ffff:187.12.45.9')).toBe('187.12.45.9');
  });
  it('aceita IPv6 válido', () => {
    expect(normalizeIp('2804:14d::1')).toBe('2804:14d::1');
  });
  it('inválido vira null', () => {
    expect(normalizeIp('lixo')).toBeNull();
    expect(normalizeIp('')).toBeNull();
    expect(normalizeIp('999.1.1.1')).toBeNull();
    expect(normalizeIp('187.12.45.9:8080')).toBeNull();
  });
});

describe('isPublicIp', () => {
  it('rejeita privados, loopback e link-local', () => {
    for (const ip of ['192.168.0.2', '10.1.2.3', '172.16.0.1', '127.0.0.1', '169.254.1.1', '::1', 'fc00::1', 'fd12::1', 'fe80::1']) {
      expect(isPublicIp(ip)).toBe(false);
    }
  });
  it('aceita públicos', () => {
    expect(isPublicIp('187.12.45.9')).toBe(true);
    expect(isPublicIp('172.32.0.1')).toBe(true);
    expect(isPublicIp('2804:14d:5c80::1')).toBe(true);
  });
});

describe('maskIp', () => {
  it('IPv4 esconde o último octeto', () => {
    expect(maskIp('187.12.45.9')).toBe('187.12.45.•');
  });
  it('IPv6 mostra só 3 grupos', () => {
    expect(maskIp('2804:14d:5c80:1:2:3:4:5')).toBe('2804:14d:5c80:•');
  });
  it('IPv6 comprimido é expandido antes', () => {
    expect(maskIp('2804:14d::1')).toBe('2804:14d:0:•');
  });
  it('IPv4 mapeado em IPv6 é tratado como IPv4', () => {
    expect(maskIp('::ffff:187.12.45.9')).toBe('187.12.45.•');
  });
  it('nunca devolve o IP inteiro', () => {
    expect(maskIp('187.12.45.9')).not.toContain('187.12.45.9');
    expect(maskIp('lixo')).toBe('•');
  });
});
