'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { LatLng } from '../../../shared/maps';

const TILE = 256;
const MIN_ZOOM = 3;
const MAX_ZOOM = 19;
const PADDING = 48;

type Pt = { x: number; y: number };

/** Web Mercator: LatLng → pixel do mundo no zoom 0 (mundo de 256 px). */
function project(p: LatLng): Pt {
  const lat = (Math.max(-85, Math.min(85, p.lat)) * Math.PI) / 180;
  return {
    x: ((p.lng + 180) / 360) * TILE,
    y: ((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * TILE,
  };
}

const clampZoom = (z: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));

/** Centro e zoom que enquadram todos os pontos no quadro (com margem). */
function fitView(points: Pt[], width: number, height: number): { center: Pt; zoom: number } {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const w = Math.max(...xs) - Math.min(...xs) || 1e-9;
  const h = Math.max(...ys) - Math.min(...ys) || 1e-9;
  const zoom = Math.log2(Math.min((width - PADDING * 2) / w, (height - PADDING * 2) / h));
  return {
    center: { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 },
    zoom: clampZoom(Math.min(zoom, 17)),
  };
}

/**
 * Rota desenhada sobre os tiles do OpenStreetMap (sem biblioteca): enquadra origem, destino e o
 * traçado e desenha a linha em SVG. Arrastar, pinça, roda do mouse e os botões +/− mexem só no mapa
 * (`touch-action: none`), sem dar zoom na página.
 */
export function RouteMap({ path, origin, destination }: { path: LatLng[]; origin: LatLng; destination: LatLng }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [view, setView] = useState<{ center: Pt; zoom: number } | null>(null);
  const pointers = useRef(new Map<number, Pt>());

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Enquadra ao receber a rota (ou na primeira medida do quadro).
  const ready = !!size && size.w > 0 && size.h > 0;
  useEffect(() => {
    if (!ready || !size) return;
    setView(fitView([origin, destination, ...path].map(project), size.w, size.h));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, path, origin, destination]);

  /** Zoom mantendo fixo o ponto da tela `anchor` (px relativos ao quadro). */
  const zoomAt = (delta: number, anchor?: Pt) => {
    setView((v) => {
      if (!v || !size) return v;
      const zoom = clampZoom(v.zoom + delta);
      const a = anchor ?? { x: size.w / 2, y: size.h / 2 };
      const scale = 2 ** v.zoom;
      const world = { x: v.center.x + (a.x - size.w / 2) / scale, y: v.center.y + (a.y - size.h / 2) / scale };
      const k = 2 ** (v.zoom - zoom);
      return { zoom, center: { x: world.x + (v.center.x - world.x) * k, y: world.y + (v.center.y - world.y) * k } };
    });
  };

  // Roda do mouse: listener nativo não passivo para poder cancelar o scroll da página.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(-e.deltaY * 0.002, { x: e.clientX - r.left, y: e.clientY - r.top });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  const local = (e: ReactPointerEvent): Pt => {
    const r = ref.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, local(e));
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const next = local(e);
    const all = [...pointers.current.entries()];
    if (all.length >= 2) {
      const other = all.find(([id]) => id !== e.pointerId)![1];
      const before = Math.hypot(prev.x - other.x, prev.y - other.y);
      const after = Math.hypot(next.x - other.x, next.y - other.y);
      if (before > 0 && after > 0) {
        zoomAt(Math.log2(after / before), { x: (next.x + other.x) / 2, y: (next.y + other.y) / 2 });
      }
    } else {
      setView((v) => {
        if (!v) return v;
        const scale = 2 ** v.zoom;
        return { ...v, center: { x: v.center.x - (next.x - prev.x) / scale, y: v.center.y - (next.y - prev.y) / scale } };
      });
    }
    pointers.current.set(e.pointerId, next);
  };

  const onPointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
  };

  let content = null;
  if (size && view) {
    const zi = Math.floor(view.zoom);
    const scale = 2 ** view.zoom; // px de tela por px do mundo no zoom 0
    const tileSize = TILE * 2 ** (view.zoom - zi);
    const left = view.center.x * scale - size.w / 2;
    const top = view.center.y * scale - size.h / 2;
    const at = (p: LatLng) => {
      const q = project(p);
      return { x: q.x * scale - left, y: q.y * scale - top };
    };

    const n = 2 ** zi;
    const tiles: { key: string; src: string; x: number; y: number }[] = [];
    for (let tx = Math.floor(left / tileSize); tx <= Math.floor((left + size.w) / tileSize); tx++) {
      for (let ty = Math.floor(top / tileSize); ty <= Math.floor((top + size.h) / tileSize); ty++) {
        if (ty < 0 || ty >= n) continue;
        const wx = ((tx % n) + n) % n;
        tiles.push({
          key: `${zi}/${tx}/${ty}`,
          src: `https://tile.openstreetmap.org/${zi}/${wx}/${ty}.png`,
          x: tx * tileSize - left,
          y: ty * tileSize - top,
        });
      }
    }

    const line = path
      .map((p) => {
        const q = at(p);
        return `${q.x.toFixed(1)},${q.y.toFixed(1)}`;
      })
      .join(' ');
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
            draggable={false}
            // A política de tiles do OSM exige Referer: sem ele o servidor devolve 403 "Access blocked".
            referrerPolicy="strict-origin-when-cross-origin"
            className="pointer-events-none absolute max-w-none select-none"
            style={{ left: t.x, top: t.y, width: tileSize + 0.5, height: tileSize + 0.5 }}
          />
        ))}
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

  const zoomButton = 'grid h-10 w-10 place-items-center bg-background text-foreground transition hover:bg-muted';

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Mapa com a rota até o local"
      className="relative h-full w-full cursor-grab touch-none overflow-hidden bg-muted active:cursor-grabbing"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      {content}
      <div className="absolute bottom-6 right-2 flex flex-col overflow-hidden rounded-xl border border-border shadow-md">
        <button type="button" aria-label="Aproximar" className={zoomButton} onClick={() => zoomAt(1)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" aria-label="Afastar" className={`${zoomButton} border-t border-border`} onClick={() => zoomAt(-1)}>
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-background/80 px-1.5 text-[10px] text-muted-foreground">
        © OpenStreetMap
      </span>
    </div>
  );
}
