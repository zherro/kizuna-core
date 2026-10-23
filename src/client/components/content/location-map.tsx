'use client';

import { useMemo, useState } from 'react';
import { Expand, Route } from 'lucide-react';
import { osmEmbedUrl } from '../../../shared/maps';
import { LazyMount } from '../lazy-mount';
import { Sheet, SheetContent, SheetTitle } from '../ui/sheet';
import { RouteBar, useRouteSummary } from './route-bar';
import { RouteMap } from './route-map';

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/**
 * Mapa incorporado do OpenStreetMap (sem chave, sem biblioteca). Na página é uma prévia sem
 * interação: o iframe só monta quando a área entra na tela (`LazyMount`). Com `routeBar` (padrão),
 * clicar na prévia abre o modal (bottom sheet no mobile, diálogo centrado no desktop) com o mapa
 * interativo, que só monta ao abrir, e a barra "Calcular rota". O estado da rota fica aqui, então
 * o resultado sobrevive a fechar e abrir. A página do OpenStreetMap carrega junto — citar na
 * política de privacidade.
 */
export function LocationMap({
  lat,
  lng,
  title,
  height = 280,
  routeBar = true,
  routeEndpoint,
}: {
  lat: number;
  lng: number;
  title: string;
  height?: number;
  /** Prévia clicável que abre o modal com mapa e "Calcular rota" (geolocalização só no clique). */
  routeBar?: boolean;
  routeEndpoint?: string;
}) {
  const destination = useMemo(() => ({ lat, lng }), [lat, lng]);
  const route = useRouteSummary(destination, routeEndpoint);
  const [open, setOpen] = useState(false);
  const routed = route.route.status === 'done' && route.route.route.path && route.position ? route.route.route.path : null;

  const iframe = (interactive: boolean) => (
    <iframe
      title={`Mapa: ${title}`}
      src={osmEmbedUrl({ lat, lng })}
      className="h-full w-full border-0"
      loading="lazy"
      referrerPolicy="no-referrer"
      tabIndex={interactive ? undefined : -1}
      aria-hidden={interactive ? undefined : true}
      style={interactive ? undefined : { pointerEvents: 'none' }}
    />
  );

  if (!routeBar) {
    return (
      <div>
        <div className="overflow-hidden rounded-2xl border border-border bg-muted" style={{ height }}>
          <LazyMount minHeight={height} className="h-full">
            {iframe(true)}
          </LazyMount>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`Abrir mapa e rota: ${title}`}
        className={`group relative block w-full overflow-hidden rounded-2xl border border-border bg-muted text-left ${FOCUS}`}
        style={{ height }}
      >
        <LazyMount minHeight={height} className="h-full">
          {iframe(false)}
        </LazyMount>
        <span className="absolute left-2 top-2 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-foreground shadow-lg transition group-hover:brightness-110">
          <Route className="h-4 w-4" aria-hidden="true" />
          Ver mapa e rota
        </span>
        <span className="absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-full bg-background/90 text-foreground shadow" aria-hidden="true">
          <Expand className="h-4 w-4" />
        </span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          aria-label={`Mapa e rota: ${title}`}
          closeClassName="top-2.5 h-9 w-9 rounded-full bg-brand text-brand-foreground shadow-md hover:bg-brand hover:text-brand-foreground hover:brightness-110"
          className="flex max-h-[96dvh] flex-col p-0 md:bottom-auto md:left-1/2 md:right-auto md:top-1/2 md:max-h-[92dvh] md:w-[min(72rem,94vw)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl"
        >
          <div className="flex items-center gap-3 border-b border-border py-3 pl-4 pr-14">
            <SheetTitle className="min-w-0 truncate text-base font-bold">{title}</SheetTitle>
          </div>
          <div className="relative h-[calc(70dvh+60px)] min-h-[380px] md:h-[min(80vh,720px)]">
            {routed && route.position ? (
              <RouteMap path={routed} origin={route.position} destination={destination} />
            ) : (
              iframe(true)
            )}
            <div className="pointer-events-none absolute inset-x-2 top-2 flex justify-start [&>*]:pointer-events-auto">
              <RouteBar state={route} className="max-w-full" />
            </div>
          </div>
          <div className="px-4 pb-2">
              </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
