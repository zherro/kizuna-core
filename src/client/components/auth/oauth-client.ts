'use client';

/** Mesmo canal/tipo que o callback do servidor usa (oauth-handlers.ts → POPUP_MESSAGE). */
const POPUP_MESSAGE = 'kizuna:oauth';
const AUTH_PAGES = new Set(['/login', '/registre-se']);

type PopupMessage = { type: typeof POPUP_MESSAGE; ok: boolean; error?: string };

/** Para onde voltar depois do login: a página atual, ou o `returnTo`/`/painel` se for /login|/registre-se. */
export function resolveReturnTo(explicit?: string): string {
  if (explicit) return explicit;
  if (typeof window === 'undefined') return '/painel';
  const { pathname, search } = window.location;
  if (AUTH_PAGES.has(pathname)) {
    const fromQuery = new URLSearchParams(search).get('returnTo');
    return fromQuery || '/painel';
  }
  return `${pathname}${search}`;
}

/** Login concluído: vai para `target` (recarrega se já está nele, para a página ver a sessão). */
export function goAfterLogin(target: string): void {
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
  const finish = (msg: PopupMessage) => {
    if (done) return;
    done = true;
    channel?.close();
    window.removeEventListener('message', onWindowMessage);
    if (msg.ok) goAfterLogin(target);
    // Cancelou: a pessoa continua onde estava.
    else if (msg.error && msg.error !== 'cancelado') goToLoginError(msg.error, target);
  };
  const isPopupMessage = (data: unknown): data is PopupMessage =>
    Boolean(data) && (data as PopupMessage).type === POPUP_MESSAGE;

  function onWindowMessage(event: MessageEvent) {
    if (event.origin === window.location.origin && isPopupMessage(event.data)) finish(event.data);
  }
  window.addEventListener('message', onWindowMessage);
  try {
    channel = new BroadcastChannel(POPUP_MESSAGE);
    channel.onmessage = (event) => {
      if (isPopupMessage(event.data)) finish(event.data);
    };
  } catch {
    channel = null;
  }
}
