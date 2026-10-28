'use client';

import { useEffect } from 'react';
import type { LatLng } from '../../../shared/maps';
import { MapAttribution, MapTiles, MapZoomControls } from '../map/map-parts';
import { computeFrame, fitView, project, useMapViewport } from '../map/map-viewport';

/**
 * Rota desenhada sobre os tiles do OpenStreetMap (sem biblioteca): enquadra origem, destino e o
 * traçado e desenha a linha em SVG. Arrastar, pinça, roda do mouse e os botões +/− mexem só no mapa
 * (`touch-action: none`), sem dar zoom na página. Projeção, tiles e gestos vêm de `map/map-viewport`.
 */
export function RouteMap({ path, origin, destination }: { path: LatLng[]; origin: LatLng; destination: LatLng }) {
  const { ref, size, view, setView, ready, zoomAt, gestures } = useMapViewport();

  // Enquadra ao receber a rota (ou na primeira medida do quadro).
  useEffect(() => {
    if (!ready || !size) return;
    setView(fitView([origin, destination, ...path].map(project), size.w, size.h));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, path, origin, destination]);

  let content = null;
  if (size && view) {
    const frame = computeFrame(view, size);
    const line = path
      .map((p) => {
        const q = frame.at(p);
        return `${q.x.toFixed(1)},${q.y.toFixed(1)}`;
      })
      .join(' ');
    const o = frame.at(origin);
    const d = frame.at(destination);

    content = (
      <>
        <MapTiles frame={frame} />
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          <polyline points={line} fill="none" stroke="white" strokeWidth={9} strokeLinejoin="round" strokeLinecap="round" />
          <polyline points={line} fill="none" stroke="var(--brand, #e4572e)" strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={o.x} cy={o.y} r={8} fill="#2563eb" stroke="white" strokeWidth={3} />
          <circle cx={d.x} cy={d.y} r={10} fill="var(--brand, #e4572e)" stroke="white" strokeWidth={3} />
          <circle cx={d.x} cy={d.y} r={3.5} fill="white" />
        </svg>
      </>
    );
  }

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Mapa com a rota até o local"
      className="relative h-full w-full cursor-grab touch-none overflow-hidden bg-muted active:cursor-grabbing"
      {...gestures}
    >
      {content}
      <MapZoomControls onZoomIn={() => zoomAt(1)} onZoomOut={() => zoomAt(-1)} />
      <MapAttribution />
    </div>
  );
}
