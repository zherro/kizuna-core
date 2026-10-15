'use client';

import { useEffect, useState } from 'react';
import { Car, Footprints, Loader2, Navigation, Route } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { directionsLinks, formatRouteLeg, type LatLng, type RouteSummary } from '../../../shared/maps';
import { useCurrentPosition } from '../../hooks/use-current-position';

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-brand';
const LINK = `inline-flex min-h-9 items-center gap-1.5 rounded-full bg-brand-foreground/15 px-3 text-xs font-semibold text-brand-foreground transition hover:bg-brand-foreground/25 ${FOCUS}`;

type RouteState = { status: 'idle' | 'loading' | 'error' } | { status: 'done'; route: RouteSummary };

/**
 * Estado da rota: posição do aparelho (só sob `request()`, nunca ao montar) e o percurso a pé e de
 * carro vindo de `endpoint`. Fica em quem abre o modal, para o resultado sobreviver a fechar/abrir.
 */
export function useRouteSummary(destination: LatLng, endpoint = '/api/location/route') {
  const { status, position, request } = useCurrentPosition();
  const [route, setRoute] = useState<RouteState>({ status: 'idle' });

  useEffect(() => {
    if (status !== 'granted' || !position) return;
    const ctrl = new AbortController();
    setRoute({ status: 'loading' });
    const qs = `from=${position.lat},${position.lng}&to=${destination.lat},${destination.lng}`;
    fetch(`${endpoint}?${qs}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<RouteSummary>) : Promise.reject()))
      .then((data) => setRoute({ status: 'done', route: data }))
      .catch(() => !ctrl.signal.aborted && setRoute({ status: 'error' }));
    return () => ctrl.abort();
  }, [status, position, destination.lat, destination.lng, endpoint]);

  return { status, position, request, route, destination };
}

export type RouteSummaryState = ReturnType<typeof useRouteSummary>;

/** Barra "Calcular rota" na cor do tema (sobre o topo do mapa). Recebe o estado de `useRouteSummary`. */
export function RouteBar({ state, className }: { state: RouteSummaryState; className?: string }) {
  const { status, position, request, route, destination } = state;
  const origin = status === 'granted' && position ? { lat: position.lat, lng: position.lng } : null;
  const links = directionsLinks({ destination, origin });
  const loading = status === 'asking' || route.status === 'loading';

  const shell = cn('rounded-xl bg-brand text-brand-foreground shadow-lg', className);

  if (route.status === 'done') {
    const r = route.route;
    const leg = (Icon: typeof Car, text: string, how: string) => (
      <p className="flex min-w-0 items-center gap-2">
        <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 text-sm leading-tight">
          <strong className="block font-bold tabular-nums">{text}</strong>
          <span className="text-xs opacity-85">{how}{r.approx ? ' · aprox.' : ''}</span>
        </span>
      </p>
    );
    return (
      <div role="status" className={cn(shell, 'w-full p-3')}>
        <div className="grid grid-cols-2 gap-3">
          {leg(Footprints, formatRouteLeg(r.foot), 'a pé')}
          {leg(Car, formatRouteLeg(r.car), 'de carro')}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {links.google ? (
            <a href={links.google} target="_blank" rel="noopener noreferrer" className={LINK}>
              <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
              Google Maps
            </a>
          ) : null}
          {links.waze ? (
            <a href={links.waze} target="_blank" rel="noopener noreferrer" className={LINK}>
              <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
              Waze
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  if (status === 'denied' || status === 'unavailable' || route.status === 'error') {
    const message =
      status === 'denied'
        ? 'Sem acesso à sua localização. Libere nas configurações do navegador ou abra a rota direto.'
        : 'Não deu para calcular a rota agora.';
    return (
      <div role="status" className={cn(shell, 'flex w-full flex-wrap items-center gap-x-3 gap-y-2 p-3 text-sm')}>
        <p className="min-w-0 flex-1 leading-snug">{message}</p>
        {links.google ? (
          <a href={directionsLinks({ destination }).google!} target="_blank" rel="noopener noreferrer" className={LINK}>
            <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
            Abrir no Google Maps
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={request}
      disabled={loading}
      aria-busy={loading ? 'true' : undefined}
      className={cn(
        shell,
        'inline-flex min-h-11 items-center gap-2 px-4 text-sm font-semibold transition hover:brightness-110 disabled:cursor-wait',
        FOCUS
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Route className="h-4 w-4" aria-hidden="true" />}
      {loading ? 'Calculando rota…' : 'Calcular rota a partir de você'}
    </button>
  );
}
