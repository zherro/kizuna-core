'use client';

import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TaxonomyIcon } from '../taxonomy/taxonomy-icon';
import { cn } from '../../../lib/utils';

export type IconCarouselItem = {
  id: string | number;
  label: string;
  /** lucide-react export name persisted on the entity (e.g. "Home"); rendered via <TaxonomyIcon>. */
  icon?: string | null;
  active?: boolean;
  onClick?: () => void;
};

type IconCarouselProps = {
  items: IconCarouselItem[];
  ariaPrevLabel?: string;
  ariaNextLabel?: string;
  className?: string;
};

/**
 * Presentational-only horizontal carousel of icon + label cards. Receives a list of
 * config items and renders them — no data fetching, no business logic. Same Embla
 * setup as the home page's category strip (dragFree, prev/next).
 */
export function IconCarousel({
  items,
  ariaPrevLabel = 'Anterior',
  ariaNextLabel = 'Próximo',
  className,
}: IconCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true,
  });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    queueMicrotask(onSelect);
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  if (items.length === 0) return null;

  const showNav = canPrev || canNext;

  return (
    <div className={cn('relative flex items-center gap-2', className)}>
      {showNav && (
        <button
          type="button"
          aria-label={ariaPrevLabel}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/50 bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
          disabled={!canPrev}
          onClick={() => emblaApi?.scrollPrev()}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-2">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              aria-pressed={item.active}
              className={cn(
                'group flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-[13px] transition-colors duration-200',
                item.active
                  ? 'border-primary/70 bg-primary/10 text-primary'
                  : 'border-border/40 bg-card text-foreground hover:border-primary/40 hover:bg-primary/5'
              )}
            >
              <TaxonomyIcon
                icon={item.icon}
                className={cn(
                  'h-[26px] w-[26px] shrink-0',
                  item.active ? 'text-primary' : 'text-primary/80'
                )}
              />
              <span className="whitespace-nowrap font-normal">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {showNav && (
        <button
          type="button"
          aria-label={ariaNextLabel}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/50 bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
          disabled={!canNext}
          onClick={() => emblaApi?.scrollNext()}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
