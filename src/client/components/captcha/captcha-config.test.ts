// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isCaptchaRequired } from './captcha-config';

const ENV_KEYS = ['NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'AUTH_CAPTCHA_ENABLED'] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  delete window.__KIZUNA_CAPTCHA_ENABLED__;
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  delete window.__KIZUNA_CAPTCHA_ENABLED__;
});

describe('isCaptchaRequired (browser)', () => {
  it('sem chave pública: desligado', () => {
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    expect(isCaptchaRequired()).toBe(false);
  });

  it('com chave e sem flag no window: ligado (comportamento antigo)', () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'site';
    expect(isCaptchaRequired()).toBe(true);
  });

  it('com chave e flag false gravada pelo layout: desligado sem rebuild', () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'site';
    window.__KIZUNA_CAPTCHA_ENABLED__ = false;
    expect(isCaptchaRequired()).toBe(false);
  });
});
