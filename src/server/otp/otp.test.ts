import { afterEach, describe, expect, it, vi } from 'vitest';
import { maskPhone, normalizeBrMobile } from './phone';
import {
  isPhoneLoginEnabled,
  registerOtpProvider,
  resolveOtpChain,
  resolveOtpConfig,
  sendOtp,
} from './registry';
import { generateOtpCode, hashOtpCode } from '../otp-handlers';
import type { OtpPayload } from './types';

describe('normalizeBrMobile', () => {
  it.each([
    ['(65) 99999-8888', '+5565999998888'],
    ['65999998888', '+5565999998888'],
    ['+55 65 99999-8888', '+5565999998888'],
    ['5565999998888', '+5565999998888'],
    ['0065999998888', null],
    ['065999998888', '+5565999998888'],
    ['6533334444', null], // fixo
    ['(05) 99999-8888', null], // DDD inválido
    ['65899998888', null], // não começa com 9
    ['', null],
    [null, null],
  ])('%s → %s', (input, out) => {
    expect(normalizeBrMobile(input as string | null)).toBe(out);
  });

  it('mascara', () => {
    expect(maskPhone('+5565999998888')).toBe('(65) 9****-8888');
  });
});

describe('cadeia de provedores', () => {
  afterEach(() => vi.restoreAllMocks());

  it('log funciona em dev e some em produção', () => {
    expect(resolveOtpChain({ providers: ['log'] }, false).map((p) => p.name)).toEqual(['log']);
    expect(resolveOtpChain({ providers: ['log'] }, true)).toEqual([]);
  });

  it('sem config = desligado; nome desconhecido é ignorado', () => {
    expect(isPhoneLoginEnabled(undefined)).toBe(false);
    expect(resolveOtpChain({ providers: ['nao-existe'] }, false)).toEqual([]);
  });

  it('provedor real registrado habilita em produção e faz fallback em ordem', async () => {
    const failing = {
      name: 'falha-test',
      send: vi.fn(async () => ({ ok: false, provider: 'falha-test', error: 'x' })),
    };
    const good = { name: 'ok-test', send: vi.fn(async () => ({ ok: true, provider: 'ok-test' })) };
    registerOtpProvider(failing);
    registerOtpProvider(good);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const chain = resolveOtpChain({ providers: ['falha-test', 'ok-test'] }, true);
    expect(chain.map((p) => p.name)).toEqual(['falha-test', 'ok-test']);

    const payload: OtpPayload = {
      phone: '+5565999998888',
      code: '123456',
      expiresInSec: 300,
      purpose: 'login',
      locale: 'pt-BR',
      requestId: 'r',
    };
    await expect(sendOtp(chain, payload)).resolves.toEqual({ ok: true, provider: 'ok-test' });
    expect(failing.send).toHaveBeenCalledWith(payload);
  });

  it('config com limites', () => {
    const cfg = resolveOtpConfig({ codeLength: 99, ttlSec: 1 });
    expect(cfg.codeLength).toBe(8);
    expect(cfg.ttlSec).toBe(60);
    expect(cfg.maxAttempts).toBe(5);
  });
});

describe('código', () => {
  it('gera com zeros à esquerda e tamanho fixo', () => {
    for (let i = 0; i < 50; i++) expect(generateOtpCode(6)).toMatch(/^\d{6}$/);
  });

  it('hash depende de telefone, propósito e código', () => {
    process.env.PGRST_JWT_SECRET = 'test-secret';
    const a = hashOtpCode('+5565999998888', 'login', '123456');
    expect(a).toHaveLength(64);
    expect(hashOtpCode('+5565999998888', 'login', '123456')).toBe(a);
    expect(hashOtpCode('+5565999998888', 'verify_phone', '123456')).not.toBe(a);
    expect(hashOtpCode('+5565999998887', 'login', '123456')).not.toBe(a);
  });
});
