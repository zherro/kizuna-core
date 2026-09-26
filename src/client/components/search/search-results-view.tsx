'use client';

import { MapPin, SearchX } from 'lucide-react';
import { ListingResultCard } from '../ui-better-soft/lists/listing-result-card';
import { formatCurrency } from '../../../lib/shared/currency-mask';
import { PRICE_UNIT_LABEL } from '../services/service-labels';
import type { ServiceResult } from './search-types';
import { formatLocationLabel } from './format-location-label';

export type ResultsScope = 'city' | 'state' | 'related' | 'empty';

type Props = {
  results: ServiceResult[];
  loading: boolean;
  scope: ResultsScope;
  stateName: string;
  cityName: string | null;
  layout: 'grid' | 'strip';
  onClearFilters: () => void;
  onChangeLocation: () => void;
  /** Paginação — só no `layout="grid"`. */
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
};

function priceLabel(r: ServiceResult): string {
  const isQuote = r.price_type === 'quote' || r.price == null || Number(r.price) <= 0;
  if (isQuote) return 'Sob consulta';
  const unit = PRICE_UNIT_LABEL[r.price_type] ?? '';
  return `${formatCurrency(Number(r.price))}${unit ? ` ${unit}` : ''}`;
}

function toCardProps(r: ServiceResult) {
  return {
    href: `/anuncios/${r.uid}`,
    title: r.title,
    priceLabel: priceLabel(r),
    tagLabel: r.category,
    subtitleLabel: r.subcategory,
    imageUrl: r.cover_file_id ? `/api/public/storage/files/${r.cover_file_id}/content` : null,
    locationLabel: formatLocationLabel(r),
    highlighted: r.sponsored,
    highlightLabel: 'Patrocinado',
    providerName: r.provider_name,
    providerAvatarUrl: r.provider_avatar,
    rating: r.rating,
    reviewCount: r.reviews,
    ctaLabel: 'Ver serviço',
  };
}

function scopeHeading(scope: ResultsScope, stateName: string, cityName: string | null): string {
  switch (scope) {
    case 'city':
      return cityName ? `Serviços em ${cityName}` : `Serviços em ${stateName}`;
    case 'state':
      return `Em todo o ${stateName}`;
    case 'related':
      return 'Poucos resultados por perto — veja opções relacionadas';
    case 'empty':
      return 'Nenhum resultado';
  }
}

export function SearchResultsView({
  results,
  loading,
  scope,
  stateName,
  cityName,
  layout,
  onClearFilters,
  onChangeLocation,
  hasMore,
  loadingMore,
  onLoadMore,
}: Props) {
  if (loading) {
    return (
      <div
        className={
          layout === 'strip'
            ? 'flex gap-3 overflow-x-auto pb-2'
            : 'grid grid-cols-1 gap-4 min-[500px]:grid-cols-2 min-[900px]:grid-cols-3'
        }
      >
        {Array.from({ length: layout === 'strip' ? 4 : 6 }).map((_, i) => (
          <div
            key={i}
            className={
              layout === 'strip'
                ? 'h-56 w-[260px] shrink-0 animate-pulse rounded-xl bg-muted'
                : 'h-72 animate-pulse rounded-2xl bg-muted'
            }
          />
        ))}
      </div>
    );
  }

  if (scope === 'empty' || results.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <SearchX className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-lg font-semibold">Nenhum resultado</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Tente outra descrição, ajuste os filtros ou troque a localização.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={onClearFilters}
            className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Limpar filtros
          </button>
          <button
            onClick={onChangeLocation}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
          >
            <MapPin className="h-4 w-4" /> Trocar localização
          </button>
        </div>
      </div>
    );
  }

  if (layout === 'strip') {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {results.map((r) => (
          <ListingResultCard key={r.uid} {...toCardProps(r)} variant="strip" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {scopeHeading(scope, stateName, cityName)}
        </h2>
        <span className="text-xs text-muted-foreground">{results.length} resultado(s)</span>
      </div>
      <div className="grid grid-cols-1 gap-4 min-[500px]:grid-cols-2 min-[900px]:grid-cols-3 min-[1400px]:grid-cols-4">
        {results.map((r) => (
          <ListingResultCard key={r.uid} {...toCardProps(r)} variant="grid" />
        ))}
      </div>
      {hasMore && onLoadMore && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="rounded-full border border-border px-5 py-2 text-sm font-semibold hover:bg-accent disabled:opacity-60"
          >
            {loadingMore ? 'Carregando…' : 'Ver mais resultados'}
          </button>
        </div>
      )}
    </div>
  );
}
