'use client';

import { useEffect, useState } from 'react';

type Provider = { id: string; label: string };

type SocialLoginButtonsProps = {
  /** Para onde voltar depois do login. Padrão: a página atual (ou `/painel` se for /login|/registre-se). */
  returnTo?: string;
  /** Endpoint que lista os provedores habilitados. */
  providersEndpoint?: string;
  /** Quando informado e o servidor tiver OTP configurado, mostra "Entrar com telefone". */
  onPhoneLogin?: () => void;
};

const AUTH_PAGES = new Set(['/login', '/registre-se']);

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z"
      />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z" />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z"
      />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <path d="M11 18h2" strokeLinecap="round" />
    </svg>
  );
}

const ICONS: Record<string, () => React.ReactElement> = { google: GoogleIcon };

function resolveReturnTo(explicit?: string): string {
  if (explicit) return explicit;
  if (typeof window === 'undefined') return '/painel';
  const { pathname, search } = window.location;
  if (AUTH_PAGES.has(pathname)) {
    const fromQuery = new URLSearchParams(search).get('returnTo');
    return fromQuery || '/painel';
  }
  return `${pathname}${search}`;
}

/**
 * Botões "Continuar com <provedor>" + separador "ou". Não renderiza nada quando nenhum provedor
 * está configurado (envs ausentes), então é seguro deixar em qualquer formulário.
 */
export function SocialLoginButtons({
  returnTo,
  providersEndpoint = '/api/auth/providers',
  onPhoneLogin,
}: SocialLoginButtonsProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [phoneEnabled, setPhoneEnabled] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(providersEndpoint)
      .then((r) => (r.ok ? r.json() : { providers: [] }))
      .then((data: { providers?: Provider[]; phone?: boolean }) => {
        if (!alive) return;
        setProviders(Array.isArray(data.providers) ? data.providers : []);
        setPhoneEnabled(data.phone === true);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [providersEndpoint]);

  const showPhone = phoneEnabled && Boolean(onPhoneLogin);
  if (!providers.length && !showPhone) return null;

  const start = (id: string) => {
    const target = encodeURIComponent(resolveReturnTo(returnTo));
    window.location.assign(`/api/auth/oauth/${encodeURIComponent(id)}/start?returnTo=${target}`);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {providers.map((p) => {
          const Icon = ICONS[p.id];
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => start(p.id)}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              {Icon ? <Icon /> : null}
              Continuar com {p.label}
            </button>
          );
        })}
        {showPhone ? (
          <button
            type="button"
            onClick={onPhoneLogin}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <PhoneIcon />
            Entrar com telefone
          </button>
        ) : null}
      </div>
      <div className="flex items-center gap-3 text-xs uppercase text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        ou
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
