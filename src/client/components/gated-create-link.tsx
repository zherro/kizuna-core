'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MouseEvent, ReactNode } from 'react';
import { useState } from 'react';
import { cn } from '../../lib/utils';

// Link de "criar" com gate de onboarding / nível de conta. Compartilhado pelo `ListBlock` (botão e
// CTA do estado vazio) e pelo `PageHeaderBlock` (`createAction` como ação do cabeçalho).

/**
 * Checks onboarding completion by calling the existing generic RPC route
 * (`/api/postgrest/rpc`) with the already-registered `fn_is_onboarding_completed`
 * function (see `postgrestRpcs` in `@/lib/server/resources`) — no new API
 * surface, just the same call a server component would make, done from the
 * client. Fails open (returns `true`) on any error so a broken check never
 * traps the user behind a gate that can't be evaluated.
 */
async function isOnboardingCompleted(): Promise<boolean> {
  try {
    const response = await fetch('/api/postgrest/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schema: 'public',
        functionName: 'fn_is_onboarding_completed',
        params: {},
      }),
    });

    if (!response.ok) return true;

    const data = (await response.json().catch(() => null)) as { payload?: unknown } | null;
    const payload = data?.payload;

    if (typeof payload === 'boolean') return payload;
    if (Array.isArray(payload)) {
      const first = payload[0];
      if (typeof first === 'boolean') return first;
      if (first && typeof first === 'object') {
        return Boolean(Object.values(first as Record<string, unknown>)[0]);
      }
      return true;
    }
    if (payload && typeof payload === 'object') {
      return Boolean(Object.values(payload as Record<string, unknown>)[0]);
    }

    return true;
  } catch {
    return true;
  }
}

/**
 * `href` link that, when `gateUserId` is set, checks onboarding completion on click instead of
 * navigating straight away — plain `Link` when `gateUserId` is undefined (ungated screens pay
 * nothing extra). Incomplete → redirects to the onboarding screen instead of the create flow,
 * never lets the click through. The check runs on demand (not on mount) since it's only needed
 * at the moment of the click.
 */
/**
 * Nível de conta para `action`: true/false, ou null quando o projeto não expõe a rota de níveis
 * (404) — aí o chamador usa o check de onboarding. Erro de rede/servidor = false (fecha).
 */
async function isActionAllowed(action: string): Promise<boolean | null> {
  try {
    const res = await fetch(`/api/account/level?action=${encodeURIComponent(action)}`, {
      cache: 'no-store',
    });
    if (res.status === 404) return null;
    if (!res.ok) return false;
    const data = (await res.json().catch(() => null)) as { can?: { allowed?: boolean } } | null;
    return data?.can?.allowed === true;
  } catch {
    return false;
  }
}

export function GatedCreateLink({
  href,
  gateUserId,
  gateAction,
  className,
  children,
}: {
  href: string;
  gateUserId?: string;
  gateAction?: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  async function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if ((!gateUserId && !gateAction) || checking) return;
    event.preventDefault();
    setChecking(true);
    try {
      if (gateAction) {
        const allowed = await isActionAllowed(gateAction);
        if (allowed !== null) {
          router.push(allowed ? href : `/painel/onboarding?acao=${encodeURIComponent(gateAction)}`);
          return;
        }
      }
      const completed = await isOnboardingCompleted();
      router.push(completed ? href : '/painel/onboarding?motivo=novo-servico');
    } catch {
      // Check itself failed (network/RPC error) — fail open rather than trap the user behind a
      // gate that can't be evaluated.
      router.push(href);
    } finally {
      setChecking(false);
    }
  }

  return (
    <Link href={href} onClick={handleClick} className={cn(className, checking && 'opacity-70')}>
      {children}
    </Link>
  );
}
