'use client';

import { useEffect } from 'react';
import { goAfterLogin, goToLoginError, resolveReturnTo } from './oauth-client';

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const ENDPOINT = '/api/auth/oauth/google/onetap';

type GoogleIdApi = {
  initialize(config: Record<string, unknown>): void;
  prompt(): void;
  cancel(): void;
};

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdApi } };
  }
}

let gsiLoading: Promise<GoogleIdApi> | null = null;

function loadGsi(): Promise<GoogleIdApi> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  gsiLoading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.onload = () => {
      const api = window.google?.accounts?.id;
      if (api) resolve(api);
      else reject(new Error('gsi_unavailable'));
    };
    script.onerror = () => {
      gsiLoading = null;
      reject(new Error('gsi_load_failed'));
    };
    document.head.appendChild(script);
  });
  return gsiLoading;
}

/**
 * Google One Tap: o "balãozinho" no canto da tela ("Fazer login em <site> com o Google") para quem
 * já tem conta Google no navegador. O `AuthProvider` já monta este componente com
 * `active` = visitante anônimo; só aparece quando o servidor tem o Google configurado (e
 * `GOOGLE_ONE_TAP` ≠ `false`).
 */
export function GoogleOneTap({ active, returnTo }: { active: boolean; returnTo?: string }) {
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let api: GoogleIdApi | null = null;

    (async () => {
      const res = await fetch(ENDPOINT, { credentials: 'same-origin', cache: 'no-store' });
      if (!res.ok) return;
      const cfg = (await res.json()) as { clientId?: string; nonce?: string };
      if (!cfg.clientId || !cfg.nonce || cancelled) return;
      api = await loadGsi();
      if (cancelled) return;

      api.initialize({
        client_id: cfg.clientId,
        nonce: cfg.nonce,
        auto_select: false,
        cancel_on_tap_outside: true,
        context: 'signin',
        itp_support: true,
        use_fedcm_for_prompt: true,
        callback: async ({ credential }: { credential?: string }) => {
          if (!credential) return;
          const target = resolveReturnTo(returnTo);
          const login = await fetch(ENDPOINT, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential }),
          }).catch(() => null);
          const data = (await login?.json().catch(() => null)) as
            | { ok?: boolean; error?: string }
            | null;
          if (data?.ok) goAfterLogin(target);
          else goToLoginError(data?.error || 'falha_login', target);
        },
      });
      api.prompt();
    })().catch(() => undefined);

    return () => {
      cancelled = true;
      api?.cancel();
    };
  }, [active, returnTo]);

  return null;
}
