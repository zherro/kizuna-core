'use client';

import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Loader2, LocateFixed } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { LatLng } from '../../../shared/maps';
import { viewRadiusKm, type SearchArea } from './map-api';
import { MapAttribution, MapTiles, MapZoomControls } from './map-parts';
import { pinStyleFor, type MapGroupStyles } from './map-styles';
import { clampZoom, computeFrame, project, unproject, useMapViewport } from './map-viewport';

export type MapPlace = {
  /** Chave do pino (`uid:address_id`). */
  id: string;
  title: string;
  /** Local (casa/endereço/cidade) mostrado sob o nome. */
  kicker?: string;
  lat: number;
  lng: number;
  /** Anúncio a que o pino pertence (para o detalhe sob demanda). */
  uid?: string;
  groupSlug?: string | null;
  imageUrl?: string | null;
  city?: string | null;
  state?: string | null;
};

/** Pedido para centrar o mapa num ponto; `nonce` novo = novo pedido (mesmo com o mesmo ponto). */
export type MapFocusRequest = { lat: number; lng: number; nonce: number; zoom?: number };

export type PlacesMapProps = {
  places: MapPlace[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  groupStyles?: MapGroupStyles;
  /** Centro e zoom iniciais (aplicados uma vez, quando o quadro tem tamanho). */
  initialCenter: LatLng;
  initialZoom?: number;
  /** Área visível a cada mudança da vista (centro e raio em km). Só depois de medir o quadro. */
  onAreaChange?: (area: SearchArea) => void;
  /** Ponto do usuário (só existe depois do clique em "Perto de mim"). */
  userPosition?: LatLng | null;
  focusRequest?: MapFocusRequest | null;
  /** Botão "Perto de mim": omitido se não houver `onLocate`. */
  onLocate?: () => void;
  locating?: boolean;
  /** Aviso curto ao lado do botão (ex.: localização negada). */
  locateMessage?: string | null;
  /** Barra do topo (lugar selecionado). Fica sobre o mapa e não arrasta nem dá zoom. */
  topSlot?: ReactNode;
  /** Avisos discretos no rodapé do mapa (carregando, erro, vazio). */
  notice?: ReactNode;
  label?: string;
  className?: string;
};

/** Faixa do topo que a barra do lugar selecionado pode cobrir. */
const TOP_SAFE = 190;

function Pin({
  place,
  x,
  y,
  selected,
  groupStyles,
  onSelect,
}: {
  place: MapPlace;
  x: number;
  y: number;
  selected: boolean;
  groupStyles?: MapGroupStyles;
  onSelect: () => void;
}) {
  const { color, Icon } = pinStyleFor(place.groupSlug, groupStyles);
  return (
    <button
      type="button"
      aria-label={place.title}
      aria-pressed={selected}
      data-place-id={place.id}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={cn(
        'group absolute flex h-14 w-11 -translate-x-1/2 -translate-y-full cursor-pointer items-end justify-center rounded-lg pb-0.5 outline-none',
        'focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        selected ? 'z-20' : 'z-10'
      )}
      style={{ left: x, top: y }}
    >
      <svg
        viewBox="0 0 32 42"
        aria-hidden="true"
        className={cn(
          'origin-bottom drop-shadow-[0_2px_2px_rgba(0,0,0,0.35)] motion-safe:transition-transform motion-safe:duration-150',
          selected ? 'h-12 w-9 scale-100' : 'h-10 w-[30px] scale-95 group-hover:scale-100'
        )}
      >
        <path
          d="M16 41C16 41 3 26.5 3 15.5C3 8 8.8 2 16 2C23.2 2 29 8 29 15.5C29 26.5 16 41 16 41Z"
          fill={selected ? 'var(--foreground, #111)' : color}
          stroke="white"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {Icon ? (
          <Icon x={10} y={9.5} width={12} height={12} color="white" strokeWidth={2.4} />
        ) : (
          <circle cx="16" cy="15.5" r="5" fill={selected ? color : 'white'} />
        )}
      </svg>
    </button>
  );
}

/**
 * Mapa de lugares: pinos como botões sobre os tiles do OpenStreetMap (sem biblioteca), com seleção,
 * ponto do usuário e botão "Perto de mim". Abre em `initialCenter`; quem busca os pinos escuta
 * `onAreaChange`. Depois só mexe na vista a pedido do usuário (arrastar, zoom, `focusRequest`).
 * Clicar no fundo limpa a seleção.
 */
export function PlacesMap({
  places,
  selectedId,
  onSelect,
  groupStyles,
  initialCenter,
  initialZoom = 14,
  onAreaChange,
  userPosition = null,
  focusRequest = null,
  onLocate,
  locating = false,
  locateMessage = null,
  topSlot,
  notice,
  label = 'Mapa de lugares',
  className,
}: PlacesMapProps) {
  const { ref, size, view, setView, ready, zoomAt, wasDrag, gestures } = useMapViewport();

  // Abre no centro inicial assim que o quadro tem tamanho.
  const opened = useRef(false);
  useEffect(() => {
    if (!ready || opened.current) return;
    opened.current = true;
    setView({ center: project(initialCenter), zoom: clampZoom(initialZoom) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Informa a área visível (só com vista e tamanho reais).
  const cx = view?.center.x;
  const cy = view?.center.y;
  const cz = view?.zoom;
  const sw = size?.w;
  const sh = size?.h;
  useEffect(() => {
    if (!onAreaChange || cx === undefined || cy === undefined || cz === undefined || !sw || !sh) return;
    const center = unproject({ x: cx, y: cy });
    onAreaChange({ lat: center.lat, lng: center.lng, radiusKm: viewRadiusKm({ w: sw, h: sh }, { center: { x: cx, y: cy }, zoom: cz }) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cx, cy, cz, sw, sh]);

  // Centra a pedido (ex.: "Perto de mim"): aproxima até pelo menos o zoom pedido.
  const lastNonce = useRef<number | null>(null);
  useEffect(() => {
    if (!focusRequest || !view || lastNonce.current === focusRequest.nonce) return;
    lastNonce.current = focusRequest.nonce;
    setView((v) => ({
      center: project(focusRequest),
      zoom: clampZoom(Math.max(v?.zoom ?? 0, focusRequest.zoom ?? 14)),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest, !!view]);

  // Ao selecionar, garante que o pino não fique sob a barra do topo nem fora do quadro.
  useEffect(() => {
    if (!selectedId || !view || !size) return;
    const place = places.find((p) => p.id === selectedId);
    if (!place) return;
    const frame = computeFrame(view, size);
    const pt = frame.at(place);
    const out = pt.y < TOP_SAFE || pt.y > size.h - 60 || pt.x < 30 || pt.x > size.w - 30;
    if (!out) return;
    const scale = 2 ** view.zoom;
    const target = { x: size.w / 2, y: Math.max(TOP_SAFE + 60, size.h * 0.55) };
    const world = project(place);
    setView({
      zoom: view.zoom,
      center: { x: world.x - (target.x - size.w / 2) / scale, y: world.y - (target.y - size.h / 2) / scale },
    });
    // Só reage à troca de seleção, não ao arrastar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const frame = useMemo(() => (view && size ? computeFrame(view, size) : null), [view, size]);

  const pins = useMemo(() => {
    if (!frame || !size) return [];
    return places
      .map((place) => ({ place, ...frame.at(place) }))
      .filter((p) => p.x > -40 && p.x < size.w + 40 && p.y > -10 && p.y < size.h + 60)
      .sort((a, b) => a.y - b.y);
  }, [frame, size, places]);

  const user = frame && userPosition ? frame.at(userPosition) : null;

  const legend = useMemo(() => {
    if (!groupStyles) return [];
    const seen = new Set(pins.map((p) => p.place.groupSlug).filter((g): g is string => !!g && !!groupStyles[g]));
    return [...seen].map((g) => ({ slug: g, ...groupStyles[g] }));
  }, [pins, groupStyles]);

  return (
    <div
      ref={ref}
      role="region"
      aria-label={label}
      className={cn('relative h-full w-full cursor-grab touch-none overflow-hidden bg-muted active:cursor-grabbing', className)}
      {...gestures}
      onClick={(e) => {
        // Fim de arrasto não é clique; botões e a barra do topo cuidam de si.
        if (wasDrag() || (e.target as HTMLElement).closest('button, a, [data-map-ui]')) return;
        onSelect(null);
      }}
    >
      {frame ? <MapTiles frame={frame} /> : null}

      {user ? (
        <span
          role="img"
          aria-label="Você está aqui"
          className="pointer-events-none absolute z-[5] grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center"
          style={{ left: user.x, top: user.y }}
        >
          <span className="absolute h-6 w-6 rounded-full bg-blue-600/25 motion-safe:animate-pulse" />
          <span className="relative h-3.5 w-3.5 rounded-full border-[3px] border-white bg-blue-600 shadow" />
        </span>
      ) : null}

      {pins.map(({ place, x, y }) => (
        <Pin
          key={place.id}
          place={place}
          x={x}
          y={y}
          selected={place.id === selectedId}
          groupStyles={groupStyles}
          onSelect={() => onSelect(place.id)}
        />
      ))}

      {topSlot ? (
        <div data-map-ui className="absolute inset-x-2 top-2 z-30 mx-auto max-w-2xl cursor-default">
          {topSlot}
        </div>
      ) : null}

      <div data-map-ui className="absolute bottom-6 left-2 z-30 flex max-w-[calc(100%-4.5rem)] cursor-default flex-col items-start gap-2">
        {legend.length > 0 ? (
          <ul aria-label="Legenda" className="hidden flex-wrap gap-x-3 gap-y-1 rounded-xl bg-background/90 px-3 py-2 text-xs text-foreground shadow-md sm:flex">
            {legend.map((g) => (
              <li key={g.slug} className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: g.color }} />
                {g.label}
              </li>
            ))}
          </ul>
        ) : null}
        {notice ? (
          <p role="status" className="rounded-xl bg-background/90 px-3 py-2 text-sm text-muted-foreground shadow-md">
            {notice}
          </p>
        ) : null}
        {locateMessage ? (
          <p role="status" className="rounded-xl bg-background/90 px-3 py-2 text-sm text-foreground shadow-md">
            {locateMessage}
          </p>
        ) : null}
        {onLocate ? (
          <button
            type="button"
            onClick={onLocate}
            disabled={locating}
            aria-busy={locating ? 'true' : undefined}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-4 text-sm font-semibold text-brand-foreground shadow-lg transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-wait"
          >
            {locating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LocateFixed className="h-4 w-4" aria-hidden="true" />}
            {locating ? 'Localizando…' : 'Perto de mim'}
          </button>
        ) : null}
      </div>

      <MapZoomControls onZoomIn={() => zoomAt(1)} onZoomOut={() => zoomAt(-1)} className="absolute bottom-6 right-2 z-30" />
      <MapAttribution />
    </div>
  );
}
