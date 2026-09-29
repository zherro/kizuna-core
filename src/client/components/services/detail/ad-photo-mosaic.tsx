'use client';

import { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { PhotoLightbox } from './photo-lightbox';

/**
 * Mosaico de fotos estilo OLX/iFood: 1 foto em containers estreitos, 2 lado a lado quando o
 * container é largo o bastante — `@container` no próprio grid, não no viewport, então o mesmo
 * componente funciona tanto na coluna larga da página de detalhe quanto num drawer estreito.
 * Qualquer tile abre o `PhotoLightbox` cheio; o 2º tile carrega um badge "+N" (não um overlay
 * escuro inteiro) pras fotos que não aparecem aqui.
 */
export function AdPhotoMosaic({ photos, alt }: { photos: string[]; alt: string }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0) {
    return (
      <div className="flex aspect-[16/10] w-full items-center justify-center rounded-3xl border border-dashed border-border bg-muted/40 text-muted-foreground">
        <div className="flex flex-col items-center gap-2 text-sm">
          <ImageIcon className="h-6 w-6" />
          Sem fotos
        </div>
      </div>
    );
  }

  const extra = photos.length > 2 ? photos.length - 2 : 0;

  return (
    <>
      <div className="@container">
        <div className={cn('grid grid-cols-1 gap-1.5', photos.length > 1 && '@[480px]:grid-cols-2')}>
          <Tile src={photos[0]} alt={alt} onClick={() => setLightboxIndex(0)} />
          {photos.length > 1 && (
            <Tile
              src={photos[1]}
              alt=""
              onClick={() => setLightboxIndex(1)}
              overlayCount={extra}
              className="hidden @[480px]:block"
            />
          )}
        </div>
      </div>

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          alt={alt}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}

function Tile({
  src,
  alt,
  overlayCount,
  onClick,
  className,
}: {
  src: string;
  alt: string;
  overlayCount?: number;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative aspect-[16/10] cursor-pointer overflow-hidden rounded-2xl bg-muted',
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- imagens servidas pelo storage */}
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
      />
      {!!overlayCount && (
        <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-4 py-1.5 text-2xl font-bold text-white backdrop-blur-sm">
          +{overlayCount}
        </span>
      )}
    </button>
  );
}
