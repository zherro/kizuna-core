'use client';

import type { ReactNode } from 'react';
import { MapPin, SearchX } from 'lucide-react';
import { ListingResultCard } from '../ui-better-soft/lists/listing-result-card';
import { cardPriceParts } from '../services/service-helpers';
import { resolveServiceCardVariant, type ServiceDetailConfig } from '../services/detail/category-style';
import { variantCardProps } from '../services/detail/event-card';
import { TrackView } from '../../analytics/track-view';
import type { AnalyticsSource, EventRule } from '../../../shared/analytics';
import { withSource } from '../../analytics/source';
import type { ServiceResult } from './search-types';
import { formatLocationLabel } from './format-location-label';
import { serviceHref } from '../../../shared/city-routing/city-slug';

// Até 5 por linha no desktop: card e imagem mais contidos em tela larga.
const GRID_CLASS =
  'grid grid-cols-1 gap-4 min-[500px]:grid-cols-2 min-[900px]:grid-cols-3 min-[1100px]:grid-cols-4 min-[1360px]:grid-cols-5';

export type ResultsScope = 'city' | 'state' | 'related' | 'empty';

/** O que a busca afrouxou para cair em `related`: a categoria/grupo ou o texto digitado. */
export type RelaxedFrom = 'category' | 'query';

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
  /** Título da lista no lugar do padrão por escopo (ex.: seção de região). */
  heading?: string;
  /** Nome do grupo filtrado — vira o sujeito do título ("Eventos em Cuiabá"). */
  groupName?: string | null;
  /** Com `scope="related"`: o filtro que não teve resultado (mostra o aviso "nada em X"). */
  relaxedFrom?: RelaxedFrom | null;
  /** Nome do que não teve resultado: a categoria ou o texto buscado. */
  relaxedLabel?: string | null;
  /** Origem propagada no link (`?src=`) e nas impressões. Default 'search'. */
  source?: AnalyticsSource;
  /** Item patrocinado opcional (ex.: `<AdSlot>`), inserido após o 3º resultado do grid. Colapsa se vazio. */
  sponsoredSlot?: ReactNode;
};


function toCardProps(r: ServiceResult, detailConfig?: ServiceDetailConfig | null) {
  const variant = resolveServiceCardVariant({ slug: r.category_slug, groupSlug: r.category_group_slug }, detailConfig);
  // Cada variant (cinema, evento...) tem o próprio estilo de card — a mesma que decide o detalhe.
  const price = cardPriceParts(r.price, r.price_type);
  const extra = variantCardProps(variant, { startingPrice: r.price, priceUnit: r.price_type, startsAt: r.event_start,
    venue: r.venue,
    place: formatLocationLabel(r),
  });

  return {
    href: serviceHref(r),
    title: r.title,
    priceLabel: price.amount,
    priceCaption: price.caption,
    cardStyle: 'default' as const,
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
    ctaLabel: 'Ver serviço',
    ...(extra ?? {}),
  };
}

function scopeHeading(
  scope: ResultsScope,
  stateName: string,
  cityName: string | null,
  groupName: string | null = null
): string {
  switch (scope) {
    case 'city':
      // Com grupo no filtro o título é dele ("Eventos em Cuiabá"); sem grupo, o genérico.
      return `${groupName ?? 'Serviços'} em ${cityName ?? stateName}`;
    case 'state':
      return `Em todo o ${stateName}`;
    case 'related':
      return cityName ? `Outros conteúdos em ${cityName}` : `Outros conteúdos em ${stateName}`;
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
  heading,
  groupName = null,
  relaxedFrom = null,
  relaxedLabel = null,
  source = 'search',
  sponsoredSlot = null,
}: Props) {
  const card = (r: ServiceResult, variant: 'strip' | 'grid') => {
    const item = <ListingResultCard key={r.uid} {...toCardProps(r, serviceDetailConfig)} href={withSource(serviceHref(r), source)} variant={variant} />;
    if (!impressionRule) return item;
    return (
      <TrackView
        key={r.uid}
        entityType="service"
        entityId={r.uid}
        event="impression"
        rule={impressionRule}
        source={source}
        className={variant === 'strip' ? 'shrink-0' : 'h-full'}
      >
        {item}
      </TrackView>
    );
  };

  // Esqueleto só quando não há nada pra mostrar (1ª carga). Ao refiltrar, a lista anterior fica
  // na tela (esmaecida) até a nova chegar — sem piscar vazio durante a requisição.
  const refreshing = loading && results.length > 0;
  const busy = refreshing
    ? 'pointer-events-none opacity-60 transition-opacity duration-200 motion-reduce:transition-none'
    : 'transition-opacity duration-200 motion-reduce:transition-none';

  if (loading && !refreshing) {
    return (
      <div
        className={
          layout === 'strip'
            ? 'flex gap-3 overflow-x-auto pb-2'
            : GRID_CLASS
        }
      >
        {Array.from({ length: layout === 'strip' ? 4 : 5 }).map((_, i) => (
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

  // Busca sem resultado no filtro pedido: avisa com clareza antes de mostrar outros conteúdos,
  // para a lista não parecer o resultado da categoria/texto.
  const place = cityName || stateName;
  const notice =
    scope === 'related' && relaxedFrom ? (
      <div
        role="status"
        className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[var(--ui-radius-card,1rem)] bg-muted/60 px-4 py-3.5"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background text-muted-foreground">
          <SearchX className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1 basis-56">
          <p className="text-sm font-semibold text-foreground">
            {relaxedFrom === 'category'
              ? relaxedLabel
                ? `Ainda não tem nada em ${relaxedLabel} em ${place}`
                : `Ainda não tem nada nesta categoria em ${place}`
              : relaxedLabel
                ? `Nada encontrado para “${relaxedLabel}” em ${place}`
                : `Nada encontrado em ${place}`}
          </p>
          <p className="text-sm text-muted-foreground">
            Enquanto isso, veja abaixo outros conteúdos da cidade.
          </p>
        </div>
        <button
          type="button"
          onClick={onClearFilters}
          className="rounded-[var(--ui-radius-pill,0.375rem)] border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Limpar filtros
        </button>
      </div>
    ) : null;

  if (layout === 'strip') {
    return (
      <div aria-busy={refreshing} className={busy}>
        {notice}
        <div className="flex gap-3 overflow-x-auto pb-2">
          {results.map((r) => card(r, 'strip'))}
        </div>
      </div>
    );
  }

  return (
    <div aria-busy={refreshing} className={busy}>
      {notice}
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {heading ?? scopeHeading(scope, stateName, cityName, groupName)}
        </h2>
        <span className="text-xs text-muted-foreground">
          {refreshing ? 'Atualizando…' : `${results.length} resultado(s)`}
        </span>
      </div>
      <div className={GRID_CLASS}>
        {results.slice(0, 3).map((r) => card(r, 'grid'))}
        {sponsoredSlot ? <div className="empty:hidden">{sponsoredSlot}</div> : null}
        {results.slice(3).map((r) => card(r, 'grid'))}
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
