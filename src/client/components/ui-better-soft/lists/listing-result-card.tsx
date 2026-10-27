import Link from 'next/link';
import { CalendarDays, MapPin, Sparkles, Star } from 'lucide-react';
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
   * localização em vez do preço (cinema não vende ingresso aqui, só divulga a sessão).
   * `'evento'`: capa landscape com o bloco de data (`dateLabel`) sobre ela, sem nota/estrela, local
   * e preço ("A partir de"/Gratuito) no rodapé. */
  cardStyle?: 'default' | 'cinema' | 'evento' | 'lugar';
  /** Bloco de data sobre a capa (`cardStyle='evento'`): dia ("14") + mês abreviado ("nov"). */
  dateLabel?: { day: string; month: string } | null;
  /** `'evento'`: data por extenso ("sáb., 14 de nov. · 20:00"), no lugar do valor. */
  whenLabel?: string | null;
  /** Prefixo pequeno do preço, ex. "A partir de". Renderizado sobre `priceLabel`. */
  priceCaption?: string | null;
  /** Badge no topo-direito (ex. categoria). */
  tagLabel?: string | null;
  /** Grupo da categoria ("Eventos"): no selo, em destaque antes da categoria (`tagLabel`). */
  groupLabel?: string | null;
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

function DateBlock({ date, compact }: { date: { day: string; month: string }; compact?: boolean }) {
  return (
    <span
      className={cn(
        'flex flex-col items-center rounded-[var(--ui-radius-card-compact,0.75rem)] bg-background/95 text-center shadow',
        compact ? 'px-2 py-1' : 'px-2.5 py-1.5'
      )}
    >
      <span className={cn('font-display font-black leading-none', compact ? 'text-base' : 'text-xl')}>{date.day}</span>
      <span className="mt-0.5 text-[10px] font-bold uppercase leading-none tracking-widest text-brand">
        {date.month}
      </span>
    </span>
  );
}

function PriceBlock({
  label,
  caption,
  className,
}: {
  label: string;
  caption?: string | null;
  className: string;
}) {
  return (
    <div>
      {caption && <div className="text-[11px] text-muted-foreground">{caption}</div>}
      <div className={className}>{label}</div>
    </div>
  );
}

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

/**
 * Selo do tipo do card sobre a capa, nas cores do tema: grupo em destaque (brand cheio) e a
 * categoria mais suave (brand-soft) na mesma pílula. Categoria igual ao grupo ("Cinema") não repete.
 */
function TypeBadge({ group, category }: { group?: string | null; category?: string | null }) {
  const strong = group || category;
  const soft = group && category && category.trim().toLowerCase() !== group.trim().toLowerCase() ? category : null;
  return (
    <span
      className="inline-flex max-w-[14rem] items-stretch overflow-hidden rounded-full text-[11px] leading-4 shadow-sm ring-1 ring-brand/20"
      title={soft ? `${strong} · ${soft}` : strong ?? undefined}
    >
      <span className="shrink-0 bg-brand px-2 py-0.5 font-semibold text-brand-foreground">{strong}</span>
      {soft && <span className="truncate bg-brand-soft px-2 py-0.5 font-medium text-brand">{soft}</span>}
    </span>
  );
}

function LocationLine({ label }: { label: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 text-xs text-muted-foreground" title={label}>
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
  groupLabel,
  dateLabel,
  whenLabel,
  priceCaption,
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
  const isEvento = cardStyle === 'evento';
  // Lugar: como o default, mas sem preço (vem null do chamador) e sem o "@anunciante".
  const isLugar = cardStyle === 'lugar';
  // Lugar não tem "idade": sem avaliações, nada de selo "Novo"; com avaliações, mostra a nota.
  const showRating = !isLugar || (rating != null && reviewCount > 0);
  // Evento usa o mesmo modelo de capa (e a mesma altura) do cinema: capa inteira, `object-contain`.
  const isPosterCard = isCinema || isEvento;
  const resolvedImageAspect = imageAspect ?? (isPosterCard ? 'poster' : 'landscape');
  // Evento, cinema e lugar/notícia lado a lado (grade ou carrossel) com a mesma altura: mesmo tile
  // de imagem (lugar em `cover`) e o mesmo rodapé — duas linhas de info (data ou subtítulo + local).
  const compactFooter = isPosterCard || isLugar;
  const footerTopLine = isEvento ? whenLabel : subtitleLabel;
  const tileAspect = isLugar && !imageAspect ? 'poster' : resolvedImageAspect;
  const containImage = tileAspect === 'poster' && !isLugar;
  const typeBadge = tagLabel || groupLabel ? <TypeBadge group={groupLabel} category={tagLabel} /> : null;
  const footerInfo = (
    <div className="flex min-h-8 min-w-0 flex-col justify-end">
      {footerTopLine && (
        <span
          className={cn(
            'inline-flex min-w-0 items-center gap-1 text-xs leading-4',
            isEvento ? 'font-semibold text-foreground' : 'text-muted-foreground'
          )}
          title={footerTopLine}
        >
          {isEvento && <CalendarDays className="h-3.5 w-3.5 shrink-0 text-brand" />}
          <span className="truncate">{footerTopLine}</span>
        </span>
      )}
      {locationLabel && (
        <span
          className="inline-flex min-w-0 items-center gap-1 text-xs font-medium leading-4 text-muted-foreground"
          title={locationLabel}
        >
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{locationLabel}</span>
        </span>
      )}
    </div>
  );

  // Evento, cinema e lugar/notícia: o MESMO card no carrossel (260px) e na grade (largura da coluna)
  // — sem CTA, o card inteiro é o link; data e local ficam inteiros, sem disputar espaço com botão.
  if (variant === 'strip' || compactFooter) {
    return (
      <Link
        href={href}
        className={cn(
          'group flex flex-col overflow-hidden rounded-[var(--ui-radius-card-compact,0.75rem)] border-[length:var(--ui-border-w-card,1px)] border-border bg-card shadow-[shadow:var(--ui-shadow-item,0_0_#0000)] transition hover:-translate-y-0.5 hover:shadow-md',
          variant === 'strip' ? 'w-[260px] shrink-0' : 'w-full',
          className
        )}
      >
        <div
          className={cn(
            'relative w-full overflow-hidden bg-gradient-to-br from-brand-soft to-secondary',
            tileAspect === 'poster' ? 'aspect-[1/0.85]' : 'aspect-[16/7.65]'
          )}
        >
          {imageUrl && (
            <img
              src={imageUrl}
              alt={title}
              loading="lazy"
              className={cn(
                'h-full w-full transition duration-500',
                // pôster: zoom leve que corta um pouco do topo e do rodapé da arte (igual à grade)
                containImage ? 'scale-[1.15] object-contain group-hover:scale-[1.2]' : 'object-cover group-hover:scale-105'
              )}
            />
          )}
          {highlighted && (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
              <Sparkles className="h-3 w-3" /> {highlightLabel}
            </span>
          )}
          {typeBadge && <div className="absolute right-2 top-2">{typeBadge}</div>}
          {isEvento && dateLabel && (
            <div className="absolute bottom-2 left-2">
              <DateBlock date={dateLabel} compact />
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-[11px]">
          <h3
            className={cn(
              'text-sm font-bold leading-tight',
              // reserva as 2 linhas: título curto não deixa o card mais baixo que os vizinhos
              compactFooter ? 'line-clamp-2 min-h-[2.5em]' : 'line-clamp-1'
            )}
          >
            {title}
          </h3>
          {compactFooter ? (
            <>
              {isLugar && showRating && <RatingChip rating={rating} reviewCount={reviewCount} />}
              <div className="mt-auto pt-1">{footerInfo}</div>
            </>
          ) : (
            <>
              {subtitleLabel && <p className="line-clamp-1 text-xs text-muted-foreground">{subtitleLabel}</p>}
              {showRating && <RatingChip rating={rating} reviewCount={reviewCount} />}
              {locationLabel && <LocationLine label={locationLabel} />}
              {priceLabel != null && (
                <div className="mt-auto pt-1">
                  <PriceBlock label={priceLabel} caption={priceCaption} className="text-sm font-black leading-none" />
                </div>
              )}
            </>
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
      titleLines={2}
      title={title}
      subtitle={subtitleLabel ?? undefined}
      badgeTopLeft={
        highlighted ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white">
            <Sparkles className="h-3 w-3" /> {highlightLabel}
          </span>
        ) : undefined
      }
      badgeTopRight={typeBadge ?? undefined}
      leading={
        <div className="flex flex-col gap-2">
          {showRating && <RatingChip rating={rating} reviewCount={reviewCount} />}
          {locationLabel && <LocationLine label={locationLabel} />}
          <ProviderRow providerName={providerName} providerAvatarUrl={providerAvatarUrl} />
        </div>
      }
      footer={
        <>
          {priceLabel != null && (
            <PriceBlock label={priceLabel} caption={priceCaption} className="text-lg font-black leading-none" />
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
      }
    />
  );
}
