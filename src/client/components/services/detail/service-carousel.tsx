'use client';

import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ListingResultCard } from '../../ui-better-soft/lists/listing-result-card';
import type { ServiceResult } from '../../search/search-types';
import { fileUrl, formatServicePrice } from '../service-helpers';
import { resolveServiceDetailVariant, type ServiceDetailConfig } from './category-style';

/**
 * Trilha horizontal de scroll livre com `ListingResultCard` (`variant="strip"`) — mesmo embla das
 * outras trilhas do kit. Usada pelas seções "Veja também"/"Também pode te interessar" da tela de
 * detalhe. `detailConfig` é só pra esconder o preço nos itens em variant `"cinema"` (mesma regra
 * do card de busca) — sem ele, todo item mostra preço normalmente.
 */
export function ServiceCarousel({
  services,
  detailConfig,
}: {
  services: ServiceResult[];
  detailConfig?: ServiceDetailConfig | null;
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
                href={`/anuncios/${service.uid}`}
                title={service.title}
                priceLabel={
                  isCinema ? null : formatServicePrice(Number(service.price ?? 0), service.price_type)
                }
                cardStyle={isCinema ? 'cinema' : 'default'}
                tagLabel={service.category}
                subtitleLabel={service.subcategory}
                imageUrl={service.cover_file_id ? fileUrl(service.cover_file_id) : null}
                highlighted={service.sponsored}
                highlightLabel="Patrocinado"
              />
            );
          })}
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
