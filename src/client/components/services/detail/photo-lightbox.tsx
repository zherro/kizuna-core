'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '../../../../lib/utils';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const BUTTON_ZOOM_SCALE = 2.2;

type Pan = { x: number; y: number };
type ZoomState = { scale: number; pan: Pan };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** `object-contain` box for `natural` inside `container`, at scale 1. */
function fitSize(natural: { w: number; h: number }, container: { width: number; height: number }) {
  const containerAspect = container.width / container.height;
  const naturalAspect = natural.w / natural.h;
  return naturalAspect > containerAspect
    ? { w: container.width, h: container.width / naturalAspect }
    : { h: container.height, w: container.height * naturalAspect };
}

function clampPan(
  pan: Pan,
  scale: number,
  container: { width: number; height: number },
  natural: { w: number; h: number } | null
): Pan {
  if (!natural) return { x: 0, y: 0 };
  const fit = fitSize(natural, container);
  const maxX = Math.max(0, (fit.w * scale - container.width) / 2);
  const maxY = Math.max(0, (fit.h * scale - container.height) / 2);
  return { x: clamp(pan.x, -maxX, maxX), y: clamp(pan.y, -maxY, maxY) };
}

/**
 * Visualizador de fotos em tela cheia, aberto pelo `AdPhotoMosaic`. Zoom segue o cursor/ponto
 * médio do pinça (scroll ou touch), pan é sempre clampado dentro da imagem, escala até
 * `MAX_SCALE`. Setas/miniaturas ficam fora da caixa pannable, então nunca travam a troca de foto.
 */
export function PhotoLightbox({
  photos,
  alt,
  initialIndex,
  onClose,
}: {
  photos: string[];
  alt: string;
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState<ZoomState>({ scale: MIN_SCALE, pan: { x: 0, y: 0 } });
  const [dragging, setDragging] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const naturalRef = useRef<{ w: number; h: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number; pan: Pan } | null>(null);
  const pinchStart = useRef<{ dist: number; scale: number; pan: Pan } | null>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const resetZoom = useCallback(() => setZoom({ scale: MIN_SCALE, pan: { x: 0, y: 0 } }), []);

  const go = useCallback(
    (delta: number) => {
      resetZoom();
      naturalRef.current = null;
      setIndex((i) => (i + delta + photos.length) % photos.length);
    },
    [photos.length, resetZoom]
  );

  const zoomAt = useCallback((clientX: number, clientY: number, factor: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = clientX - rect.left - rect.width / 2;
    const cy = clientY - rect.top - rect.height / 2;
    setZoom((z) => {
      const nextScale = clamp(z.scale * factor, MIN_SCALE, MAX_SCALE);
      if (nextScale <= MIN_SCALE) return { scale: MIN_SCALE, pan: { x: 0, y: 0 } };
      const nextPan = {
        x: cx - (cx - z.pan.x) * (nextScale / z.scale),
        y: cy - (cy - z.pan.y) * (nextScale / z.scale),
      };
      return { scale: nextScale, pan: clampPan(nextPan, nextScale, rect, naturalRef.current) };
    });
  }, []);

  const toggleZoomButton = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (zoom.scale > MIN_SCALE) {
      resetZoom();
      return;
    }
    const rect = el.getBoundingClientRect();
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, BUTTON_ZOOM_SCALE);
  }, [zoom.scale, resetZoom, zoomAt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && photos.length > 1) go(-1);
      else if (e.key === 'ArrowRight' && photos.length > 1) go(1);
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, go, photos.length]);

  // Listeners nativos (não passivos): handlers wheel/touchmove do React são passivos por padrão,
  // então `preventDefault()` num onWheel/onTouchMove JSX é silenciosamente ignorado pelo browser.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0022);
      zoomAt(e.clientX, e.clientY, factor);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const [a, b] = [e.touches[0], e.touches[1]];
        pinchStart.current = {
          dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
          scale: zoomRef.current.scale,
          pan: zoomRef.current.pan,
        };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStart.current) {
        e.preventDefault();
        const [a, b] = [e.touches[0], e.touches[1]];
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const ratio = dist / pinchStart.current.dist;
        const rect = el.getBoundingClientRect();
        const nextScale = clamp(pinchStart.current.scale * ratio, MIN_SCALE, MAX_SCALE);
        setZoom({
          scale: nextScale,
          pan: clampPan(pinchStart.current.pan, nextScale, rect, naturalRef.current),
        });
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchStart.current = null;
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
    // zoomRef sempre tem o scale/pan mais recente; só precisa re-bindar quando o container ou
    // `zoomAt` mudam de identidade, não a cada zoom/pan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomAt]);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    naturalRef.current = { w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight };
  }, []);

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (zoom.scale > MIN_SCALE) resetZoom();
      else zoomAt(e.clientX, e.clientY, BUTTON_ZOOM_SCALE);
    },
    [zoom.scale, resetZoom, zoomAt]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (zoom.scale <= MIN_SCALE) return;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY, pan: zoom.pan };
    },
    [zoom.scale, zoom.pan]
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nextPan = {
      x: dragStart.current.pan.x + (e.clientX - dragStart.current.x),
      y: dragStart.current.pan.y + (e.clientY - dragStart.current.y),
    };
    setZoom((z) => ({ ...z, pan: clampPan(nextPan, z.scale, rect, naturalRef.current) }));
  }, []);

  const onPointerUp = useCallback(() => {
    setDragging(false);
    dragStart.current = null;
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-background/95 backdrop-blur-xl"
      style={{
        backgroundImage:
          'radial-gradient(circle at 50% 0%, color-mix(in oklch, var(--brand) 7%, transparent), transparent 55%)',
      }}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <div className="flex items-center justify-between gap-3 p-4">
        <span className="text-sm font-medium tabular-nums text-muted-foreground">
          {index + 1} / {photos.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleZoomButton}
            aria-label={zoom.scale > MIN_SCALE ? 'Diminuir zoom' : 'Aumentar zoom'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-foreground/5 text-foreground transition hover:bg-foreground/10"
          >
            {zoom.scale > MIN_SCALE ? (
              <ZoomOut className="h-5 w-5" />
            ) : (
              <ZoomIn className="h-5 w-5" />
            )}
          </button>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-foreground/5 text-foreground transition hover:bg-foreground/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className={cn(
          'relative flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden px-4 pb-4',
          zoom.scale > MIN_SCALE ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
        )}
        onDoubleClick={onDoubleClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- imagens servidas pelo storage */}
        <img
          key={index}
          src={photos[index]}
          alt={alt}
          draggable={false}
          onLoad={onImageLoad}
          className="max-h-full max-w-full select-none object-contain"
          style={{
            transform: `translate(${zoom.pan.x}px, ${zoom.pan.y}px) scale(${zoom.scale})`,
            transition: dragging ? 'none' : 'transform 150ms ease-out',
          }}
        />

        {photos.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Foto anterior"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-foreground/5 text-foreground shadow-sm transition hover:bg-foreground/10 sm:left-6"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              aria-label="Próxima foto"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-foreground/5 text-foreground shadow-sm transition hover:bg-foreground/10 sm:right-6"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className="flex justify-center gap-2 overflow-x-auto p-4">
          {photos.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => {
                resetZoom();
                naturalRef.current = null;
                setIndex(i);
              }}
              aria-label={`Ir para foto ${i + 1}`}
              className={cn(
                'h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition',
                i === index ? 'border-brand' : 'border-transparent opacity-60 hover:opacity-90'
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- imagens servidas pelo storage */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}
