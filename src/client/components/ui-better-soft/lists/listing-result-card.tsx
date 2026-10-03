import Link from 'next/link';
import { MapPin, Sparkles, Star } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { MediaResultCard } from './media-result-card';

/**
 * Cartão de resultado de listagem de marketplace, genérico, em duas densidades:
 *
 * - `variant="grid"` (padrão): cartão vertical completo (compõe `MediaResultCard`).
 * - `variant="strip"`: cartão compacto de largura fixa (~260px), pensado para trilha horizontal
 *   com scroll (mobile).
 *
 * Recebe tudo pronto via props — não sabe se o item é serviço, produto ou evento. Preço já vem
 * formatado (`priceLabel`).
 */
export type ListingResultCardProps = {
  href: string;
  title: string;
  /** Preço já formatado, ex. "R$ 120/h" ou "Sob consulta". `null`/`undefined` omite a linha de
   * preço inteira (ex. cinema, que só divulga a sessão — quem vende é outro site). */
  priceLabel?: string | null;
  /** `'landscape'` (default) ou `'poster'` (capa em pé, ex. cartaz de filme — tile mais baixo,
   * `object-contain`). Só afeta `variant="grid"`; o `strip` sempre usa 16:9 (largura fixa). Sem
   * valor, segue `cardStyle` (`'cinema'` já usa `'poster'` por padrão). */
  imageAspect?: 'landscape' | 'poster';
  /** `'default'` (padrão) ou `'cinema'`: sem nota/estrela, título em 3 linhas, e o rodapé mostra a
   * localização em vez do preço (cinema não vende ingresso aqui, só divulga a sessão). */
  cardStyle?: 'default' | 'cinema';
  /** Badge no topo-direito (ex. categoria). */
  tagLabel?: string | null;
  /** Linha sob o título (ex. subcategoria). */
  subtitleLabel?: string | null;
  imageUrl?: string | null;
  /** Local já formatado, ex. "Cuiabá +2". Opcional. */
  locationLabel?: string | null;
  /** Estilo de destaque (ex. patrocinado). */
  highlighted?: boolean;
  highlightLabel?: string;
  /** Nome + avatar do responsável pelo anúncio. */
  providerName?: string | null;
  providerAvatarUrl?: string | null;
  /** Nota média das avaliações, ex. 4.7. `null`/`undefined` = ainda sem avaliações. */
  rating?: number | null;
  /** Total de avaliações publicadas. Default 0. */
  reviewCount?: number;
  /** Texto do botão de ação. Default "Ver". */
  ctaLabel?: string;
  variant?: 'grid' | 'strip';
  className?: string;
};

function initials(name?: string | null): string {
  return (name ?? '').trim().slice(0, 2).toUpperCase();
}

/** Chip de nota média — sempre renderiza; sem avaliações mostra "Novo". */
function RatingChip({
  rating,
  reviewCount = 0,
  className,
}: {
  rating?: number | null;
  reviewCount?: number;
  className?: string;
}) {
  const hasRating = rating != null && reviewCount > 0;
  return (
    <span className={cn('inline-flex items-center gap-1 text-[11px] font-semibold', className)}>
      <Star
        className={cn(
          'h-3 w-3',
          hasRating ? 'fill-current text-amber-500' : 'text-muted-foreground'
        )}
      />
      {hasRating ? (
        <>
          {rating.toFixed(1).replace('.', ',')}
          <span className="font-normal text-muted-foreground">({reviewCount})</span>
        </>
      ) : (
        <span className="font-normal text-muted-foreground">Novo</span>
      )}
    </span>
  );
}

function LocationLine({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground" title={label}>
      <MapPin className="h-3 w-3 shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
}

function ProviderRow({
  providerName,
  providerAvatarUrl,
  compact,
}: {
  providerName?: string | null;
  providerAvatarUrl?: string | null;
  compact?: boolean;
}) {
  if (!providerName) return null;
  const size = compact ? 'h-5 w-5 text-[9px]' : 'h-7 w-7 text-[10px]';
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-[var(--ui-radius-control,0.5rem)] border border-border bg-background/50',
        compact ? 'px-1.5 py-1' : 'px-2 py-1.5'
      )}
    >
      {providerAvatarUrl ? (
        <img
          src={providerAvatarUrl}
          alt={providerName}
          loading="lazy"
          className={cn('shrink-0 rounded-full object-cover', size)}
        />
      ) : (
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground',
            size
          )}
        >
          {initials(providerName)}
        </span>
      )}
      <span
        className="flex-1 truncate text-[11px] font-semibold text-foreground"
        title={providerName}
      >
        @{providerName}
      </span>
    </div>
  );
}

export function ListingResultCard({
  href,
  title,
  priceLabel,
  imageAspect,
  cardStyle = 'default',
  tagLabel,
  subtitleLabel,
  imageUrl,
  locationLabel,
  highlighted,
  highlightLabel = 'Destaque',
  providerName,
  providerAvatarUrl,
  rating,
  reviewCount = 0,
  ctaLabel = 'Ver',
  variant = 'grid',
  className,
}: Readonly<ListingResultCardProps>) {
  const isCinema = cardStyle === 'cinema';
  const resolvedImageAspect = imageAspect ?? (isCinema ? 'poster' : 'landscape');

  if (variant === 'strip') {
    return (
      <Link
        href={href}
        className={cn(
          'group flex w-[260px] shrink-0 flex-col overflow-hidden rounded-[var(--ui-radius-card-compact,0.75rem)] border-[length:var(--ui-border-w-card,1px)] border-border bg-card shadow-[shadow:var(--ui-shadow-item,0_0_#0000)] transition hover:-translate-y-0.5 hover:shadow-md',
          className
        )}
      >
        <div
          className={cn(
            'relative w-full overflow-hidden bg-gradient-to-br from-brand-soft to-secondary',
            resolvedImageAspect === 'poster' ? 'aspect-[1/0.85]' : 'aspect-[16/7.65]'
          )}
        >
          {imageUrl && (
            <img
              src={imageUrl}
              alt={title}
              loading="lazy"
              className={cn(
                'h-full w-full transition duration-500 group-hover:scale-105',
                resolvedImageAspect === 'poster' ? 'object-contain p-2' : 'object-cover'
              )}
            />
          )}
          {highlighted && (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
              <Sparkles className="h-3 w-3" /> {highlightLabel}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3">
          <h3
            className={cn(
              'text-sm font-bold leading-tight',
              isCinema ? 'line-clamp-3' : 'line-clamp-1'
            )}
          >
            {title}
          </h3>
          {subtitleLabel && (
            <p className="line-clamp-1 text-[11px] text-muted-foreground">{subtitleLabel}</p>
          )}
          {!isCinema && <RatingChip rating={rating} reviewCount={reviewCount} />}
          {locationLabel && <LocationLine label={locationLabel} />}
          {!isCinema && priceLabel != null && (
            <div className="mt-auto pt-1 text-sm font-black leading-none">{priceLabel}</div>
          )}
        </div>
      </Link>
    );
  }

  return (
    <MediaResultCard
      className={className}
      href={href}
      image={imageUrl}
      imageAlt={title}
      imageAspect={resolvedImageAspect}
      titleLines={isCinema ? 3 : 2}
      title={title}
      subtitle={subtitleLabel ?? undefined}
      badgeTopLeft={
        highlighted ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white">
            <Sparkles className="h-3 w-3" /> {highlightLabel}
          </span>
        ) : undefined
      }
      badgeTopRight={
        tagLabel ? (
          <span className="inline-flex items-center rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-semibold text-foreground shadow">
            {tagLabel}
          </span>
        ) : undefined
      }
      leading={
        isCinema ? undefined : (
          <div className="flex flex-col gap-2">
            <RatingChip rating={rating} reviewCount={reviewCount} />
            {locationLabel && <LocationLine label={locationLabel} />}
            <ProviderRow providerName={providerName} providerAvatarUrl={providerAvatarUrl} />
          </div>
        )
      }
      footer={
        isCinema ? (
          <>
            {locationLabel ? (
              <span
                className="inline-flex min-w-0 items-center gap-1 truncate text-xs font-medium text-muted-foreground"
                title={locationLabel}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{locationLabel}</span>
              </span>
            ) : (
              <span />
            )}
            <span className="ml-auto inline-flex shrink-0 items-center rounded-[var(--ui-radius-pill,0.375rem)] bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground transition group-hover:bg-brand/90">
              {ctaLabel}
            </span>
          </>
        ) : (
          <>
            {priceLabel != null && (
              <div className="text-lg font-black leading-none">{priceLabel}</div>
            )}
            <span
              className={cn(
                'inline-flex shrink-0 items-center rounded-[var(--ui-radius-pill,0.375rem)] bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground transition group-hover:bg-brand/90',
                priceLabel == null && 'ml-auto'
              )}
            >
              {ctaLabel}
            </span>
          </>
        )
      }
    />
  );
}
