'use client';

import { useEffect, useRef, useState } from 'react';
import type { LatLng } from '../../../shared/maps';

const TILE = 256;
const MAX_ZOOM = 18;
const PADDING = 48;

/** Web Mercator: LatLng → pixel do mundo no zoom `z`. */
function project(p: LatLng, z: number) {
  const size = TILE * 2 ** z;
  const lat = (Math.max(-85, Math.min(85, p.lat)) * Math.PI) / 180;
  return {
    x: ((p.lng + 180) / 360) * size,
    y: ((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * size,
  };
}

/** Maior zoom em que todo o traçado cabe no quadro (com margem). */
function fitZoom(points: LatLng[], width: number, height: number): number {
  for (let z = MAX_ZOOM; z > 1; z--) {
    const px = points.map((p) => project(p, z));
    const w = Math.max(...px.map((p) => p.x)) - Math.min(...px.map((p) => p.x));
    const h = Math.max(...px.map((p) => p.y)) - Math.min(...px.map((p) => p.y));
    if (w <= width - PADDING * 2 && h <= height - PADDING * 2) return z;
  }
  return 1;
}

/**
 * Rota desenhada sobre os tiles do OpenStreetMap (sem biblioteca): enquadra origem, destino e o
 * traçado, e desenha a linha em SVG. Estático — o mapa interativo segue sendo o `LocationMap`.
 */
export function RouteMap({ path, origin, destination }: { path: LatLng[]; origin: LatLng; destination: LatLng }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  let content = null;
  if (size && size.w > 0 && size.h > 0) {
    const points = [origin, destination, ...path];
    const z = fitZoom(points, size.w, size.h);
    const px = points.map((p) => project(p, z));
    const cx = (Math.min(...px.map((p) => p.x)) + Math.max(...px.map((p) => p.x))) / 2;
    const cy = (Math.min(...px.map((p) => p.y)) + Math.max(...px.map((p) => p.y))) / 2;
    const left = cx - size.w / 2;
    const top = cy - size.h / 2;
    const at = (p: LatLng) => {
      const q = project(p, z);
      return { x: q.x - left, y: q.y - top };
    };

    const n = 2 ** z;
    const tiles: { key: string; src: string; x: number; y: number }[] = [];
    for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + size.w) / TILE); tx++) {
      for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + size.h) / TILE); ty++) {
        if (ty < 0 || ty >= n) continue;
        const wx = ((tx % n) + n) % n;
        tiles.push({
          key: `${tx}/${ty}`,
          src: `https://tile.openstreetmap.org/${z}/${wx}/${ty}.png`,
          x: tx * TILE - left,
          y: ty * TILE - top,
        });
      }
    }

    const line = path.map((p) => {
      const q = at(p);
      return `${q.x.toFixed(1)},${q.y.toFixed(1)}`;
    }).join(' ');
    const o = at(origin);
    const d = at(destination);

    content = (
      <>
        {tiles.map((t) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={t.key}
            src={t.src}
            alt=""
            width={TILE}
            height={TILE}
            draggable={false}
            referrerPolicy="no-referrer"
            className="absolute max-w-none select-none"
            style={{ left: t.x, top: t.y }}
          />
        ))}
        <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
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
    <div ref={ref} role="img" aria-label="Mapa com a rota até o local" className="relative h-full w-full overflow-hidden bg-muted">
      {content}
      <span className="absolute bottom-1 right-1 rounded bg-background/80 px-1.5 text-[10px] text-muted-foreground">
        © OpenStreetMap
      </span>
    </div>
  );
}
