'use client';

import { createContext, useContext, useEffect, useState, type AnchorHTMLAttributes, type ReactNode } from 'react';
import type { AnalyticsPlacement, AnalyticsSource, EventRule } from '../../shared/analytics';
import { contactChannelFromHref, isAnalyticsChannel, type AnalyticsChannel } from '../../shared/analytics/channel';
import { trackEvent } from './analytics-api';
import { resolveAdPlacement, resolveAdSource } from './source';
import { TrackView } from './track-view';

type Ctx = { uid: string; source: AnalyticsSource | null; placement: AnalyticsPlacement | null };
const AdTrackingContext = createContext<Ctx | null>(null);

/**
 * Contexto de analytics do anúncio: uid + origem (resolvida no client). Qualquer botão/link de
 * contato dentro dele usa `useTrackContact` / `TrackedContactLink`. Fora dele, tudo vira no-op.
 */
export function AdTrackingProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const [source, setSource] = useState<AnalyticsSource | null>(null);
  const [placement, setPlacement] = useState<AnalyticsPlacement | null>(null);
  useEffect(() => {
    setSource(resolveAdSource(uid));
    setPlacement(resolveAdPlacement(uid));
  }, [uid]);
  return <AdTrackingContext.Provider value={{ uid, source, placement }}>{children}</AdTrackingContext.Provider>;
}

/** Origem resolvida do anúncio corrente (`undefined` fora do provider ou antes de montar). */
export function useAdSource(): AnalyticsSource | undefined {
  return useContext(AdTrackingContext)?.source ?? undefined;
}

/** 'sponsored' se o detalhe veio de uma vaga patrocinada (`?pl=sp`); null = orgânico/fora do provider. */
export function useAdPlacement(): AnalyticsPlacement | null {
  return useContext(AdTrackingContext)?.placement ?? null;
}

/**
 * Retorna `(channel?) => void` que registra `contact_click` do anúncio corrente (no-op fora do
 * provider). `channel` = canal do botão (whatsapp, phone, purchase...); o do hook vale se a chamada
 * não passar um.
 */
export function useTrackContact(defaultChannel?: AnalyticsChannel): (channel?: AnalyticsChannel) => void {
  const ctx = useContext(AdTrackingContext);
  return (channel?: AnalyticsChannel) => {
    if (!ctx) return;
    trackEvent({
      entityType: 'service',
      entityId: ctx.uid,
      event: 'contact_click',
      source: ctx.source ?? resolveAdSource(ctx.uid),
      placement: ctx.placement ?? resolveAdPlacement(ctx.uid),
      // `isAnalyticsChannel`: usado direto como onClick, o 1º argumento é o evento do clique.
      channel: isAnalyticsChannel(channel) ? channel : defaultChannel ?? null,
    });
  };
}

/**
 * `<a>` que conta `contact_click` ao clicar (telefone, WhatsApp, e-mail, site, ingresso). O canal
 * sai do href (tel:, mailto:, wa.me, instagram.com, http → site); link de compra passa
 * `channel="purchase"`.
 */
export function TrackedContactLink({
  onClick,
  children,
  channel,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { channel?: AnalyticsChannel }) {
  const track = useTrackContact();
  return (
    <a
      {...rest}
      onClick={(e) => {
        track(channel ?? contactChannelFromHref(rest.href));
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
  const placement = useAdPlacement();
  return (
    <TrackView
      entityType="service"
      entityId={uid}
      event={event}
      rule={source ? rule : null}
      source={source}
      placement={placement}
    >
      {children}
    </TrackView>
  );
}
