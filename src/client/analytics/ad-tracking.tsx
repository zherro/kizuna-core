'use client';

import { createContext, useContext, useEffect, useState, type AnchorHTMLAttributes, type ReactNode } from 'react';
import type { AnalyticsSource, EventRule } from '../../shared/analytics';
import { trackEvent } from './analytics-api';
import { resolveAdSource } from './source';
import { TrackView } from './track-view';

type Ctx = { uid: string; source: AnalyticsSource | null };
const AdTrackingContext = createContext<Ctx | null>(null);

/**
 * Contexto de analytics do anúncio: uid + origem (resolvida no client). Qualquer botão/link de
 * contato dentro dele usa `useTrackContact` / `TrackedContactLink`. Fora dele, tudo vira no-op.
 */
export function AdTrackingProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const [source, setSource] = useState<AnalyticsSource | null>(null);
  useEffect(() => {
    setSource(resolveAdSource(uid));
  }, [uid]);
  return <AdTrackingContext.Provider value={{ uid, source }}>{children}</AdTrackingContext.Provider>;
}

/** Origem resolvida do anúncio corrente (`undefined` fora do provider ou antes de montar). */
export function useAdSource(): AnalyticsSource | undefined {
  return useContext(AdTrackingContext)?.source ?? undefined;
}

/** Retorna `() => void` que registra `contact_click` do anúncio corrente (no-op fora do provider). */
export function useTrackContact(): () => void {
  const ctx = useContext(AdTrackingContext);
  return () => {
    if (!ctx) return;
    trackEvent({
      entityType: 'service',
      entityId: ctx.uid,
      event: 'contact_click',
      source: ctx.source ?? resolveAdSource(ctx.uid),
    });
  };
}

/** `<a>` que conta `contact_click` ao clicar (telefone, WhatsApp, e-mail, site, ingresso). */
export function TrackedContactLink({
  onClick,
  children,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const track = useTrackContact();
  return (
    <a
      {...rest}
      onClick={(e) => {
        track();
        onClick?.(e);
      }}
    >
      {children}
    </a>
  );
}

/** `TrackView` do detalhe: espera a origem ser resolvida e a injeta no evento. */
export function SourcedTrackView({
  uid,
  event,
  rule,
  children,
}: {
  uid: string;
  event: 'view' | 'impression';
  rule: EventRule | null;
  children: ReactNode;
}) {
  const source = useAdSource();
  return (
    <TrackView
      entityType="service"
      entityId={uid}
      event={event}
      rule={source ? rule : null}
      source={source}
    >
      {children}
    </TrackView>
  );
}
