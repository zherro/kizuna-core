'use client';

import { useEffect, useState } from 'react';
import { Car, Check, Copy, LocateFixed, Loader2, Navigation, Share2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { directionsLinks, distanceKm, formatDistanceKm, type LatLng } from '../../../shared/maps';
import { useCurrentPosition } from '../../hooks/use-current-position';

export type DirectionsCardProps = {
  destination?: LatLng | null;
  address?: string | null;
  tips?: string | null;
  /** `false` quando o `LocationMap` com a barra de rota já está na página (evita distância duplicada). */
  measure?: boolean;
  /** Pede a posição ao montar (o navegador mostra o pedido de permissão), salvo se já foi negada. */
  autoLocate?: boolean;
  /** Mostra "Compartilhar localização" (Web Share; sem ela, copia o link do Google Maps). */
  shareTitle?: string | null;
  className?: string;
};

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** Ação principal: rotas e o convite para medir a distância. */
const BUTTON = `inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground transition hover:bg-muted ${FOCUS}`;

/** Ação secundária (copiar endereço): mais discreta que as rotas. */
const BUTTON_QUIET = `inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground ${FOCUS}`;

/**
 * "Como chegar": links de rota (Google Maps, Waze), copiar endereço e, SÓ sob clique, distância em
 * linha reta a partir da posição do usuário. A posição fica em memória (ver `useCurrentPosition`)
 * e só sai do navegador quando o usuário abre o Google Maps, com a origem no link.
 */
export function DirectionsCard({
  destination = null,
  address = null,
  tips = null,
  measure = true,
  autoLocate = false,
  shareTitle = null,
  className,
}: DirectionsCardProps) {
  const { status, position, request } = useCurrentPosition();
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const canAutoLocate = autoLocate && measure && destination !== null;
  useEffect(() => {
    if (!canAutoLocate) return;
    let cancelled = false;
    const permissions = typeof navigator !== 'undefined' ? navigator.permissions : undefined;
    if (!permissions?.query) {
      request();
      return;
    }
    permissions
      .query({ name: 'geolocation' })
      .then((p) => {
        if (!cancelled && p.state !== 'denied') request();
      })
      .catch(() => {
        if (!cancelled) request();
      });
    return () => {
      cancelled = true;
    };
  }, [canAutoLocate, request]);

  const origin = status === 'granted' && position ? { lat: position.lat, lng: position.lng } : null;
  const links = directionsLinks({ destination, address, origin, label: shareTitle });
  // Sem origem: o link compartilhado leva quem recebe até o lugar a partir de onde ELE estiver.
  const shareUrl = shareTitle != null ? directionsLinks({ destination, address }).google : null;
  const hasRoute = links.google !== null || links.waze !== null;
  if (!hasRoute && !tips) return null;

  const distance = origin && destination ? formatDistanceKm(distanceKm(origin, destination)) : null;
  const canMeasure = measure && destination !== null && status !== 'granted' && status !== 'denied';

  async function copyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sem permissão de área de transferência: o botão só não confirma.
    }
  }

  async function shareLocation() {
    if (!shareUrl) return;
    const text = [shareTitle, address].filter(Boolean).join(' — ');
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: shareTitle || undefined, text: text || undefined, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(text ? `${text}
${shareUrl}` : shareUrl);
      setShared(true);
      window.setTimeout(() => setShared(false), 2000);
    } catch {
      // Cancelado pelo usuário ou sem permissão: nada a fazer.
    }
  }

  return (
    <section className={cn('rounded-2xl border border-border bg-muted/40 p-5', className)}>
      <h2 className="text-base font-bold text-foreground">Como chegar</h2>

      {address ? (
        <div className="mt-3 flex items-start justify-between gap-3">
          <p className="py-2.5 text-sm leading-6 text-foreground">{address}</p>
          <button type="button" onClick={copyAddress} className={BUTTON_QUIET}>
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      ) : null}

      {hasRoute ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {links.google ? (
            <a href={links.google} target="_blank" rel="noopener noreferrer" className={BUTTON}>
              <Navigation className="h-4 w-4 text-brand" aria-hidden="true" />
              Abrir no Google Maps
            </a>
          ) : null}
          {links.waze ? (
            <a href={links.waze} target="_blank" rel="noopener noreferrer" className={BUTTON}>
              <Navigation className="h-4 w-4 text-brand" aria-hidden="true" />
              Abrir no Waze
            </a>
          ) : null}
          {links.uber ? (
            <a href={links.uber} target="_blank" rel="noopener noreferrer" className={BUTTON}>
              <Car className="h-4 w-4 text-brand" aria-hidden="true" />
              Pedir Uber
            </a>
          ) : null}
          {shareUrl ? (
            <button type="button" onClick={shareLocation} className={BUTTON}>
              {shared ? <Check className="h-4 w-4 text-brand" aria-hidden="true" /> : <Share2 className="h-4 w-4 text-brand" aria-hidden="true" />}
              {shared ? 'Link copiado' : 'Compartilhar localização'}
            </button>
          ) : null}
        </div>
      ) : null}

      {distance ? (
        <p
          role="status"
          className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground"
        >
          <LocateFixed className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
          <span>
            Cerca de <strong className="font-bold">{distance}</strong> de você, em linha reta.
          </span>
        </p>
      ) : null}

      {canMeasure ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-background p-4">
          <p className="text-sm leading-6 text-foreground">
            Usamos sua localização só neste aparelho, para calcular a distância. Não guardamos. Se você abrir a rota no Google Maps, ele recebe sua posição como ponto de partida.
          </p>
          {/* Fica montado durante `asking` (desabilitado): quem navega por teclado não perde o foco. */}
          <button
            type="button"
            onClick={request}
            disabled={status === 'asking'}
            aria-busy={status === 'asking' ? 'true' : undefined}
            className={cn(BUTTON, 'mt-3 w-full rounded-2xl py-2 text-balance text-center disabled:cursor-wait disabled:opacity-60')}
          >
            <LocateFixed className="h-4 w-4 text-brand" aria-hidden="true" />
            Ver distância e rota a partir de você
          </button>
        </div>
      ) : null}

      {status === 'asking' ? (
        <p role="status" className="mt-4 inline-flex items-center gap-2 text-sm text-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Buscando sua localização…
        </p>
      ) : null}

      {status === 'denied' ? (
        <p role="status" className="mt-3 border-l-2 border-border pl-3 text-sm leading-6 text-muted-foreground">
          Sem acesso à sua localização. A rota continua disponível pelos botões acima. Para ver a distância, libere a localização nas configurações do navegador.
        </p>
      ) : null}
      {status === 'unavailable' ? (
        <p role="status" className="mt-3 border-l-2 border-border pl-3 text-sm leading-6 text-muted-foreground">
          Não foi possível obter sua localização agora.
        </p>
      ) : null}

      {tips ? <p className="mt-4 text-sm leading-6 text-foreground">{tips}</p> : null}
    </section>
  );
}
