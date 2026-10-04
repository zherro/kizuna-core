'use client';

import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { ListingResultCard } from '../../ui-better-soft/lists/listing-result-card';
import type { ServiceResult } from '../../search/search-types';
import { thumbUrl, formatServicePrice } from '../service-helpers';
import { serviceHref } from '../../../../shared/city-routing/city-slug';
import { formatLocationLabel } from '../../search/format-location-label';
import { resolveServiceDetailVariant, type ServiceDetailConfig } from './category-style';

/**
 * Trilha horizontal de scroll livre com `ListingResultCard` (`variant="strip"`) — mesmo embla das
 * outras trilhas do kit. Usada pelas seções "Veja também"/"Também pode te interessar" da tela de
 * detalhe. `detailConfig` é só pra esconder o preço nos itens em variant `"cinema"` (mesma regra
 * do card de busca) — sem ele, todo item mostra preço normalmente. `moreHref` acrescenta um card
 * "Ver mais" (mesma largura dos itens) no fim da trilha, pra quem sabe que há mais do que coube.
 */
export function ServiceCarousel({
  services,
  detailConfig,
  moreHref,
  moreLabel = 'Ver mais',
  showCity = false,
}: {
  services: ServiceResult[];
  detailConfig?: ServiceDetailConfig | null;
  moreHref?: string;
  moreLabel?: string;
  /** Mostra a cidade no card (use em listas globais; dentro de `/[cidade]` ela já está no topo). */
  showCity?: boolean;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', dragFree: true });
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

  return (
    <div className="group relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4">
          {services.map((service) => {
            const isCinema =
              resolveServiceDetailVariant({ slug: service.category_slug }, detailConfig) === 'cinema';
            return (
              <ListingResultCard
                key={service.uid}
                variant="strip"
                href={serviceHref(service)}
                title={service.title}
                priceLabel={
                  isCinema ? null : formatServicePrice(Number(service.price ?? 0), service.price_type)
                }
                cardStyle={isCinema ? 'cinema' : 'default'}
                tagLabel={service.category}
                subtitleLabel={service.subcategory}
                imageUrl={service.cover_file_id ? thumbUrl(service.cover_file_id) : null}
                locationLabel={showCity ? formatLocationLabel(service) : null}
                highlighted={service.sponsored}
                highlightLabel="Patrocinado"
              />
            );
          })}
          {moreHref ? (
            <Link
              href={moreHref}
              className="group/more flex w-[260px] shrink-0 flex-col items-center justify-center gap-3 rounded-[var(--ui-radius-card-compact,0.75rem)] border-[length:var(--ui-border-w-card,1px)] border-dashed border-border bg-muted/40 p-6 text-center text-foreground transition hover:-translate-y-0.5 hover:bg-muted hover:shadow-md"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background transition group-hover/more:border-primary group-hover/more:text-primary">
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="font-display text-base font-bold">{moreLabel}</span>
            </Link>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        aria-label="Anteriores"
        disabled={!canPrev}
        onClick={() => emblaApi?.scrollPrev()}
        className="absolute -left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-foreground opacity-0 shadow-sm transition-opacity duration-200 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-0 group-hover:opacity-100 sm:flex"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="Próximos"
        disabled={!canNext}
        onClick={() => emblaApi?.scrollNext()}
        className="absolute -right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-foreground opacity-0 shadow-sm transition-opacity duration-200 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-0 group-hover:opacity-100 sm:flex"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
