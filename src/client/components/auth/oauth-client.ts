'use client';

import { sanitizeReturnTo } from '../../../server/app-url';

/** Mesmo canal/tipo que o callback do servidor usa (oauth-handlers.ts → POPUP_MESSAGE). */
const POPUP_MESSAGE = 'kizuna:oauth';
/** Resposta desta aba à janela: "recebi" (oauth-handlers.ts → POPUP_ACK). */
const POPUP_ACK = 'kizuna:oauth:ack';
/** Até quando esta aba fica esperando o login na janela (depois, para de olhar). */
const WAIT_MS = 10 * 60 * 1000;
/** De quanto em quanto tempo pergunta ao servidor se o login na janela já terminou. */
const POLL_MS = 2000;
const AUTH_PAGES = new Set(['/login', '/registre-se']);

type PopupMessage = { type: typeof POPUP_MESSAGE; ok: boolean; error?: string };

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

function openCenteredPopup(url: string): Window | null {
  const w = 500;
  const h = 640;
  const left = Math.max(0, window.screenX + (window.outerWidth - w) / 2);
  const top = Math.max(0, window.screenY + (window.outerHeight - h) / 2);
  return window.open(
    url,
    'kizuna_oauth',
    `popup=yes,width=${w},height=${h},left=${Math.round(left)},top=${Math.round(top)}`
  );
}

/**
 * "Continuar com <provedor>" numa janelinha por cima do site — a pessoa não sai da página.
 * Se o navegador bloquear a janela, cai no redirect normal (página inteira).
 */
export function startOAuthLogin(providerId: string, returnTo?: string): void {
  const target = resolveReturnTo(returnTo);
  const base = `/api/auth/oauth/${encodeURIComponent(providerId)}/start?returnTo=${encodeURIComponent(target)}`;

  const popup = openCenteredPopup(`${base}&popup=1`);
  if (!popup) {
    window.location.assign(base);
    return;
  }

  let done = false;
  let channel: BroadcastChannel | null = null;
  const stopAt = Date.now() + WAIT_MS;
  const finish = (msg: PopupMessage) => {
    if (done) return;
    done = true;
    // Ack antes de fechar o canal: a janela só fecha/avisa "pode fechar" se souber que alguém recebeu.
    try {
      channel?.postMessage({ type: POPUP_ACK });
    } catch {
      // canal já fechado
    }
    channel?.close();
    window.clearInterval(watch);
    window.removeEventListener('message', onWindowMessage);
    window.removeEventListener('focus', checkSession);
    document.removeEventListener('visibilitychange', checkSession);
    if (msg.ok) goAfterLogin(target);
    // Cancelou: a pessoa continua onde estava.
    else if (msg.error && msg.error !== 'cancelado') goToLoginError(msg.error, target);
  };
  const isPopupMessage = (data: unknown): data is PopupMessage =>
    Boolean(data) && (data as PopupMessage).type === POPUP_MESSAGE;

  // Plano B, sem depender de mensagem: o Chrome isola a janela ao passar pelas páginas do Google
  // (COOP) e aí `window.opener` some, `popup.closed` vira true e o aviso pode não chegar. A sessão é
  // do site inteiro, então esta aba pergunta ao servidor se já entrou: a cada POLL_MS depois que
  // perde a janela de vista, e quando a pessoa volta para esta aba.
  let checking = false;
  async function checkSession() {
    if (done || checking) return;
    checking = true;
    try {
      const res = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' });
      const data = (await res.json().catch(() => null)) as { user?: unknown } | null;
      if (data?.user) finish({ type: POPUP_MESSAGE, ok: true });
    } catch {
      // rede: tenta de novo na próxima rodada
    } finally {
      checking = false;
    }
  }

  function onWindowMessage(event: MessageEvent) {
    if (event.origin === window.location.origin && isPopupMessage(event.data)) finish(event.data);
  }
  window.addEventListener('message', onWindowMessage);
  window.addEventListener('focus', checkSession);
  document.addEventListener('visibilitychange', checkSession);
  let lastPoll = 0;
  const watch = window.setInterval(() => {
    if (done) return;
    if (Date.now() > stopAt) {
      window.clearInterval(watch);
      window.removeEventListener('focus', checkSession);
      document.removeEventListener('visibilitychange', checkSession);
      return;
    }
    // `closed` também vira true quando o Chrome isola a janela — por isso consulta, sem desistir.
    if (popup.closed && Date.now() - lastPoll >= POLL_MS) {
      lastPoll = Date.now();
      void checkSession();
    }
  }, 500);
  try {
    channel = new BroadcastChannel(POPUP_MESSAGE);
    channel.onmessage = (event) => {
      if (isPopupMessage(event.data)) finish(event.data);
    };
  } catch {
    channel = null;
  }
}
