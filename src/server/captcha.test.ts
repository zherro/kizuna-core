import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isCaptchaEnabled, verifyCaptcha } from './captcha';

const ORIGINAL_ENV = { ...process.env };

function enableEnv() {
  process.env.TURNSTILE_SECRET_KEY = 'secret';
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'site';
  delete process.env.AUTH_CAPTCHA_ENABLED;
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.TURNSTILE_SECRET_KEY;
  delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  delete process.env.AUTH_CAPTCHA_ENABLED;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('isCaptchaEnabled', () => {
  it('false sem keys', () => {
    expect(isCaptchaEnabled()).toBe(false);
  });
  it('false com só a secret key', () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    expect(isCaptchaEnabled()).toBe(false);
  });
  it('true com as duas keys', () => {
    enableEnv();
    expect(isCaptchaEnabled()).toBe(true);
  });
  it('false quando AUTH_CAPTCHA_ENABLED === "false"', () => {
    enableEnv();
    process.env.AUTH_CAPTCHA_ENABLED = 'false';
    expect(isCaptchaEnabled()).toBe(false);
  });
});

describe('verifyCaptcha', () => {
  it('no-op quando desabilitado', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await verifyCaptcha(undefined)).toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('missing quando habilitado e sem token', async () => {
    enableEnv();
    expect(await verifyCaptcha(undefined)).toEqual({ ok: false, reason: 'missing' });
  });

  it('ok quando o Turnstile responde success: true', async () => {
    enableEnv();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ json: async () => ({ success: true }) })),
    );
    expect(await verifyCaptcha('tok', '1.2.3.4')).toEqual({ ok: true });
  });

  it('invalid quando o Turnstile responde success: false', async () => {
    enableEnv();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ json: async () => ({ success: false }) })),
    );
    expect(await verifyCaptcha('tok')).toEqual({ ok: false, reason: 'invalid' });
  });

  it('fail-open quando o fetch lança (rede/timeout)', async () => {
    enableEnv();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network');
      }),
    );
    expect(await verifyCaptcha('tok')).toEqual({ ok: true });
  });
});
