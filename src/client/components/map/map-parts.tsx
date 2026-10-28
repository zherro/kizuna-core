import { Minus, Plus } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { MapFrame } from './map-viewport';

/** Camada de tiles do OpenStreetMap. */
export function MapTiles({ frame }: { frame: MapFrame }) {
  return (
    <>
      {frame.tiles.map((t) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={t.key}
          src={t.src}
          alt=""
          draggable={false}
          // A política de tiles do OSM exige Referer: sem ele o servidor devolve 403 "Access blocked".
          referrerPolicy="strict-origin-when-cross-origin"
          className="pointer-events-none absolute max-w-none select-none"
          style={{ left: t.x, top: t.y, width: frame.tileSize + 0.5, height: frame.tileSize + 0.5 }}
        />
      ))}
    </>
  );
}

const zoomButton = 'grid h-10 w-10 place-items-center bg-background text-foreground transition hover:bg-muted';

/** Botões +/− do mapa. */
export function MapZoomControls({
  onZoomIn,
  onZoomOut,
  className = 'absolute bottom-6 right-2',
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col overflow-hidden rounded-xl border border-border shadow-md', className)}>
      <button type="button" aria-label="Aproximar" className={zoomButton} onClick={onZoomIn}>
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
      <button type="button" aria-label="Afastar" className={`${zoomButton} border-t border-border`} onClick={onZoomOut}>
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/** Crédito obrigatório dos tiles do OpenStreetMap. */
export function MapAttribution() {
  return (
    <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-background/80 px-1.5 text-[10px] text-muted-foreground">
      © OpenStreetMap
    </span>
  );
}
