/**
 * Captcha ligado na UI? Fonte única para widgets e forms (login, cadastro, telefone, esqueci a
 * senha, tickets).
 *
 * `NEXT_PUBLIC_TURNSTILE_SITE_KEY` entra no build; `AUTH_CAPTCHA_ENABLED` é de runtime e só o
 * servidor enxerga. Para a flag valer também na tela sem rebuild:
 * - no SSR, lê `AUTH_CAPTCHA_ENABLED` direto (mesma regra de `server/captcha.ts`);
 * - no browser, lê `window.__KIZUNA_CAPTCHA_ENABLED__`, que o `<CaptchaFlagScript />` do layout
 *   grava antes da hidratação quando a flag desliga o captcha.
 * Sem o script no layout, o browser segue a chave do build (comportamento antigo).
 */

declare global {
  interface Window {
    __KIZUNA_CAPTCHA_ENABLED__?: boolean;
  }
}

export const CAPTCHA_FLAG_GLOBAL = '__KIZUNA_CAPTCHA_ENABLED__';

export function isCaptchaRequired(): boolean {
  if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return false;
  if (typeof window === 'undefined') return process.env.AUTH_CAPTCHA_ENABLED !== 'false';
  return window.__KIZUNA_CAPTCHA_ENABLED__ !== false;
}
