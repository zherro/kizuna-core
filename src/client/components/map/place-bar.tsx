'use client';

import { useMemo } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { RouteBar, useRouteSummary } from '../content/route-bar';
import type { MapPlace } from './places-map';

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/**
 * Barra do topo do mapa para o pino selecionado: nome, "Calcular rota" (a `RouteBar` do core, que só
 * pede a posição no clique) e "Ver mais". Use com `key={place.id}` para o resultado da rota não
 * vazar de um lugar para outro.
 */
export function PlaceBar({
  place,
  onMore,
  onClose,
  routeEndpoint,
}: {
  place: MapPlace;
  onMore: () => void;
  onClose: () => void;
  routeEndpoint?: string;
}) {
  const destination = useMemo(() => ({ lat: place.lat, lng: place.lng }), [place.lat, place.lng]);
  const route = useRouteSummary(destination, routeEndpoint);

  return (
    <section
      aria-label={`Lugar selecionado: ${place.title}`}
      className="rounded-2xl border border-border bg-background/95 p-3 shadow-xl backdrop-blur"
    >
      <div className="flex items-start gap-2">
        {place.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={place.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl bg-muted object-cover" />
        ) : null}
        <div className="min-w-0 flex-1 pl-1">
          {place.kicker ? <p className="truncate text-xs font-medium text-muted-foreground">{place.kicker}</p> : null}
          <h2 className="font-display text-lg font-black leading-tight tracking-tight text-foreground">{place.title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className={`-mr-1 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground ${FOCUS}`}
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <RouteBar state={route} title={place.title} className="max-w-full" />
        <button
          type="button"
          onClick={onMore}
          className={`inline-flex min-h-11 items-center gap-1 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:bg-muted ${FOCUS}`}
        >
          Ver mais
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
