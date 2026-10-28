'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { LatLng } from '../../../shared/maps';

/**
 * Base compartilhada dos mapas próprios do core (tiles do OpenStreetMap, sem biblioteca):
 * projeção Web Mercator, enquadramento, quadro de tiles e o hook com medida do quadro, zoom e
 * gestos (arrastar, pinça, roda). Usada por `RouteMap` e `PlacesMap`.
 */

export const TILE = 256;
export const MIN_ZOOM = 3;
export const MAX_ZOOM = 19;
export const FIT_PADDING = 48;

export type Pt = { x: number; y: number };
export type MapView = { center: Pt; zoom: number };
export type MapSize = { w: number; h: number };

/** Web Mercator: LatLng → pixel do mundo no zoom 0 (mundo de 256 px). */
export function project(p: LatLng): Pt {
  const lat = (Math.max(-85, Math.min(85, p.lat)) * Math.PI) / 180;
  return {
    x: ((p.lng + 180) / 360) * TILE,
    y: ((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * TILE,
  };
}

/** Inverso de `project`: pixel do mundo no zoom 0 → LatLng. */
export function unproject(p: Pt): LatLng {
  const n = Math.PI - (2 * Math.PI * p.y) / TILE;
  return {
    lat: (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))),
    lng: (p.x / TILE) * 360 - 180,
  };
}

export const clampZoom = (z: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));

/** Centro e zoom que enquadram todos os pontos no quadro (com margem). */
export function fitView(
  points: Pt[],
  width: number,
  height: number,
  { maxZoom = 17, padding = FIT_PADDING }: { maxZoom?: number; padding?: number } = {}
): MapView {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const w = Math.max(...xs) - Math.min(...xs) || 1e-9;
  const h = Math.max(...ys) - Math.min(...ys) || 1e-9;
  const zoom = Math.log2(Math.min((width - padding * 2) / w, (height - padding * 2) / h));
  return {
    center: { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 },
    zoom: clampZoom(Math.min(zoom, maxZoom)),
  };
}

export type MapTileImage = { key: string; src: string; x: number; y: number };
export type MapFrame = {
  tileSize: number;
  tiles: MapTileImage[];
  /** LatLng → pixel dentro do quadro. */
  at: (p: LatLng) => Pt;
};

/** Tiles visíveis e conversão LatLng → tela para uma vista e um tamanho de quadro. */
export function computeFrame(view: MapView, size: MapSize): MapFrame {
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
  const tiles: MapTileImage[] = [];
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
  return { tileSize, tiles, at };
}

const DRAG_THRESHOLD = 4;
/** Elementos de interface sobre o mapa: não iniciam arrasto nem capturam a roda. */
const UI_SELECTOR = 'button, a, [data-map-ui]';

/**
 * Estado do quadro do mapa: mede o elemento (`ref`), guarda a vista, aplica zoom e gestos.
 * `wasDrag()` diz se o último toque virou arrasto (para não tratar o fim do arrasto como clique).
 */
export function useMapViewport() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<MapSize | null>(null);
  const [view, setView] = useState<MapView | null>(null);
  const pointers = useRef(new Map<number, Pt>());
  const downAt = useRef<Pt | null>(null);
  const dragged = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ready = !!size && size.w > 0 && size.h > 0;

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
      if ((e.target as HTMLElement | null)?.closest?.('[data-map-ui]')) return;
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
    if ((e.target as HTMLElement).closest(UI_SELECTOR)) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = local(e);
    if (pointers.current.size === 0) {
      downAt.current = p;
      dragged.current = false;
    }
    pointers.current.set(e.pointerId, p);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const next = local(e);
    if (downAt.current && Math.hypot(next.x - downAt.current.x, next.y - downAt.current.y) > DRAG_THRESHOLD) {
      dragged.current = true;
    }
    const all = [...pointers.current.entries()];
    if (all.length >= 2) {
      dragged.current = true;
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

  const wasDrag = useCallback(() => dragged.current, []);

  return {
    ref,
    size,
    view,
    setView,
    ready,
    zoomAt,
    wasDrag,
    gestures: { onPointerDown, onPointerMove, onPointerUp: onPointerEnd, onPointerCancel: onPointerEnd },
  };
}
