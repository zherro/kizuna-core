'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';

const OUTPUT_SIZE = 512;
const MAX_ZOOM = 4;
/** Diâmetro do círculo em relação ao quadro. */
const CIRCLE_RATIO = 0.84;

type Props = {
  file: File;
  onCancel: () => void;
  onConfirm: (cropped: File) => void;
};

type Pt = { x: number; y: number };

/**
 * Recorte da foto de perfil antes do envio, no estilo do WhatsApp: a imagem fica atrás de um
 * círculo (o resto escurecido mostra o que vai ser cortado); arrastar posiciona, o slider / a roda
 * do mouse / a pinça (dois dedos) dão zoom. Confirmar gera um JPEG quadrado de 512px no próprio
 * aparelho — o envio fica bem menor que a foto original da câmera.
 */
export function AvatarCropper({ file, onCancel, onConfirm }: Props) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [frame, setFrame] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Pt>({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);

  const pointers = useRef(new Map<number, Pt>());
  const gesture = useRef<{ dist: number; zoom: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => setFrame(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onCancel]);

  const diameter = frame * CIRCLE_RATIO;
  const baseScale = natural ? diameter / Math.min(natural.w, natural.h) : 1;
  const scale = baseScale * zoom;

  const clamp = useCallback(
    (p: Pt, z: number): Pt => {
      if (!natural) return p;
      const s = baseScale * z;
      const maxX = Math.max(0, (natural.w * s - diameter) / 2);
      const maxY = Math.max(0, (natural.h * s - diameter) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, p.x)),
        y: Math.min(maxY, Math.max(-maxY, p.y)),
      };
    },
    [natural, baseScale, diameter]
  );

  const applyZoom = useCallback(
    (z: number) => {
      const next = Math.min(MAX_ZOOM, Math.max(1, z));
      setZoom(next);
      setOffset((o) => clamp(o, next));
    },
    [clamp]
  );

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);

    if (pointers.current.size === 2 && gesture.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      applyZoom(gesture.current.zoom * (dist / Math.max(1, gesture.current.dist)));
      return;
    }
    setOffset((o) => clamp({ x: o.x + cur.x - prev.x, y: o.y + cur.y - prev.y }, zoom));
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current = null;
  }

  function onWheel(e: React.WheelEvent) {
    applyZoom(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08));
  }

  async function confirm() {
    if (!natural || !src) return;
    setBusy(true);
    try {
      const img = new Image();
      img.src = src;
      await img.decode();
      const left = frame / 2 + offset.x - (natural.w * scale) / 2;
      const top = frame / 2 + offset.y - (natural.h * scale) / 2;
      const circleStart = (frame - diameter) / 2;
      const sx = (circleStart - left) / scale;
      const sy = (circleStart - top) / scale;
      const sSize = diameter / scale;

      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas');
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
      if (!blob) throw new Error('blob');
      onConfirm(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
    } catch {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ajustar foto de perfil"
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
    >
      <div className="w-full max-w-md overflow-hidden rounded-t-[var(--ui-radius-sheet-top,1rem)] bg-card shadow-xl sm:rounded-[var(--ui-radius-card,1rem)]">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="font-semibold">Ajustar foto</p>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancelar"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          ref={frameRef}
          className="relative aspect-square w-full touch-none select-none overflow-hidden bg-black"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
        >
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt=""
              draggable={false}
              onLoad={(e) =>
                setNatural({
                  w: e.currentTarget.naturalWidth,
                  h: e.currentTarget.naturalHeight,
                })
              }
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none cursor-grab"
              style={
                natural
                  ? {
                      width: natural.w * scale,
                      height: natural.h * scale,
                      transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                    }
                  : { opacity: 0 }
              }
            />
          ) : null}
          {/* Círculo de recorte: a sombra gigante escurece tudo o que fica de fora. */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white/80"
            style={{
              width: diameter,
              height: diameter,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
            }}
          />
        </div>

        <div className="space-y-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => applyZoom(zoom / 1.2)}
              aria-label="Diminuir zoom"
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(e) => applyZoom(Number(e.target.value))}
              aria-label="Zoom"
              className="h-1.5 flex-1 cursor-pointer accent-[var(--primary)]"
            />
            <button
              type="button"
              onClick={() => applyZoom(zoom * 1.2)}
              aria-label="Aumentar zoom"
              className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Arraste para posicionar e use o zoom para enquadrar.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="h-10 flex-1 rounded-[var(--ui-radius-pill,0.375rem)] border border-border text-sm font-medium hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void confirm()}
              disabled={!natural || busy}
              className="h-10 flex-1 rounded-[var(--ui-radius-pill,0.375rem)] bg-primary text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {busy ? 'Preparando...' : 'Usar foto'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
