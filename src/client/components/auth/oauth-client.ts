'use client';

import { sanitizeReturnTo } from '../../../server/app-url';

const AUTH_PAGES = new Set(['/login', '/registre-se']);

/** Para onde voltar depois do login: a página atual, ou o `returnTo`/`/painel` se for /login|/registre-se. */
export function resolveReturnTo(explicit?: string): string {
  if (explicit) return sanitizeReturnTo(explicit, '/painel');
  if (typeof window === 'undefined') return '/painel';
  const { pathname, search } = window.location;
  if (AUTH_PAGES.has(pathname)) {
    // `returnTo` vem da URL: só caminho do próprio site (nada de `https://…` nem `javascript:`).
    return sanitizeReturnTo(new URLSearchParams(search).get('returnTo'), '/painel');
  }
  return `${pathname}${search}`;
}

/** Login concluído: vai para `target` (recarrega se já está nele, para a página ver a sessão). */
export function goAfterLogin(rawTarget: string): void {
  const target = sanitizeReturnTo(rawTarget, '/painel');
  const here = `${window.location.pathname}${window.location.search}`;
  if (target === here) window.location.reload();
  else window.location.assign(target);
}

/** Erro de login: leva ao /login com a mensagem (mesmo destino do fluxo por redirect). */
export function goToLoginError(code: string, returnTo: string): void {
  const params = new URLSearchParams({ erro: code });
  if (returnTo && returnTo !== '/') params.set('returnTo', returnTo);
  window.location.assign(`/login?${params.toString()}`);
}

/**
 * "Continuar com <provedor>": vai ao provedor na própria aba e volta logado para `returnTo`.
 * Sem janela popup de propósito: o Chrome isola a janela nas páginas do Google (COOP) e aí a
 * janela não consegue avisar a aba nem se fechar — o login acabava aberto dentro da janela.
 */
export function startOAuthLogin(providerId: string, returnTo?: string): void {
  const target = resolveReturnTo(returnTo);
  window.location.assign(
    `/api/auth/oauth/${encodeURIComponent(providerId)}/start?returnTo=${encodeURIComponent(target)}`
  );
}
