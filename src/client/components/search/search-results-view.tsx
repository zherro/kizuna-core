'use client';

import { MapPin, SearchX } from 'lucide-react';
import { ListingResultCard } from '../ui-better-soft/lists/listing-result-card';
import { formatCurrency } from '../../../lib/shared/currency-mask';
import { PRICE_UNIT_LABEL } from '../services/service-labels';
import { resolveServiceDetailVariant, type ServiceDetailConfig } from '../services/detail/category-style';
import { TrackView } from '../../analytics/track-view';
import type { EventRule } from '../../../shared/analytics';
import type { ServiceResult } from './search-types';
import { formatLocationLabel } from './format-location-label';
import { serviceHref } from '../../../shared/city-routing/city-slug';

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
  /** Config `serviceDetail` do `kizuna.config.json` — mesma que a tela de detalhe usa, aqui só pra
   * decidir o estilo do CARD (hoje: esconder preço + capa em pé nas categorias em variant
   * `"cinema"`). Sem ela, todo card usa o estilo padrão (com preço, capa 3:2). */
  serviceDetailConfig?: ServiceDetailConfig | null;
  /** Plugin analytics: regra da impressão (`resolveEventRule`); cada card conta ao ficar visível. */
  impressionRule?: EventRule | null;
};

function priceLabel(r: ServiceResult): string {
  const isQuote = r.price_type === 'quote' || r.price == null || Number(r.price) <= 0;
  if (isQuote) return 'Sob consulta';
  const unit = PRICE_UNIT_LABEL[r.price_type] ?? '';
  return `${formatCurrency(Number(r.price))}${unit ? ` ${unit}` : ''}`;
}

function toCardProps(r: ServiceResult, detailConfig?: ServiceDetailConfig | null) {
  const variant = resolveServiceDetailVariant({ slug: r.category_slug }, detailConfig);
  // O card de cinema só divulga a sessão (não vende o ingresso) e usa capa de filme em pé —
  // mesma variant que decide o layout de detalhe, sem config própria pro card.
  const isCinema = variant === 'cinema';

  return {
    href: serviceHref(r),
    title: r.title,
    priceLabel: isCinema ? null : priceLabel(r),
    cardStyle: isCinema ? ('cinema' as const) : ('default' as const),
    tagLabel: r.category,
    subtitleLabel: r.subcategory,
    imageUrl: r.cover_file_id ? `/api/public/storage/files/${r.cover_file_id}/content?size=thumb` : null,
    locationLabel: formatLocationLabel(r),
    highlighted: r.sponsored,
    highlightLabel: 'Patrocinado',
    providerName: r.provider_name,
    providerAvatarUrl: r.provider_avatar,
    rating: r.rating,
    reviewCount: r.reviews,
    ctaLabel: isCinema ? 'Ver sessões' : 'Ver serviço',
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
  serviceDetailConfig,
  impressionRule = null,
}: Props) {
  const card = (r: ServiceResult, variant: 'strip' | 'grid') => {
    const item = <ListingResultCard key={r.uid} {...toCardProps(r, serviceDetailConfig)} variant={variant} />;
    if (!impressionRule) return item;
    return (
      <TrackView
        key={r.uid}
        entityType="service"
        entityId={r.uid}
        event="impression"
        rule={impressionRule}
        source="search"
        className={variant === 'strip' ? 'shrink-0' : 'h-full'}
      >
        {item}
      </TrackView>
    );
  };

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
      <div className="rounded-[var(--ui-radius-card,1rem)] border border-dashed border-border bg-card p-10 text-center">
        <SearchX className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-lg font-semibold">Nenhum resultado</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Tente outra descrição, ajuste os filtros ou troque a localização.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={onClearFilters}
            className="rounded-[var(--ui-radius-pill,0.375rem)] border border-border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Limpar filtros
          </button>
          <button
            onClick={onChangeLocation}
            className="inline-flex items-center gap-1 rounded-[var(--ui-radius-pill,0.375rem)] border border-border px-3 py-1.5 text-sm hover:bg-accent"
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
        {results.map((r) => card(r, 'strip'))}
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
        {results.map((r) => card(r, 'grid'))}
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
