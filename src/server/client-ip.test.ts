import { afterEach, describe, expect, it } from 'vitest';
import { trustedClientIp } from './client-ip';

const req = (h: Record<string, string>) => new Request('http://x.test', { headers: h });

afterEach(() => {
  delete process.env.TRUSTED_PROXY_HOPS;
});

describe('trustedClientIp', () => {
  it('uma entrada só vale essa entrada', () => {
    expect(trustedClientIp(req({ 'x-forwarded-for': '203.0.113.7' }))).toBe('203.0.113.7');
  });
  it('ignora o valor forjado à esquerda e usa o último salto', () => {
    expect(trustedClientIp(req({ 'x-forwarded-for': '1.1.1.1, 203.0.113.7' }))).toBe('203.0.113.7');
  });
  it('respeita TRUSTED_PROXY_HOPS', () => {
    process.env.TRUSTED_PROXY_HOPS = '2';
    expect(trustedClientIp(req({ 'x-forwarded-for': '1.1.1.1, 203.0.113.7, 10.0.0.1' }))).toBe('203.0.113.7');
  });
  it('sem XFF usa x-real-ip; sem nada devolve vazio', () => {
    expect(trustedClientIp(req({ 'x-real-ip': '198.51.100.2' }))).toBe('198.51.100.2');
    expect(trustedClientIp(req({}))).toBe('');
  });
});
