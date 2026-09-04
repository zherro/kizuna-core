import Link from 'next/link';
import { Sparkles } from 'lucide-react';
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
  /** Preço já formatado, ex. "R$ 120/h" ou "Sob consulta". */
  priceLabel: string;
  /** Badge no topo-direito (ex. categoria). */
  tagLabel?: string | null;
  /** Linha sob o título (ex. subcategoria). */
  subtitleLabel?: string | null;
  imageUrl?: string | null;
  /** Estilo de destaque (ex. patrocinado). */
  highlighted?: boolean;
  highlightLabel?: string;
  /** Nome + avatar do responsável pelo anúncio. */
  providerName?: string | null;
  providerAvatarUrl?: string | null;
  /** Texto do botão de ação. Default "Ver". */
  ctaLabel?: string;
  variant?: 'grid' | 'strip';
  className?: string;
};

function initials(name?: string | null): string {
  return (name ?? '').trim().slice(0, 2).toUpperCase();
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
        'flex items-center gap-2 rounded-lg border border-border bg-background/50',
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
  tagLabel,
  subtitleLabel,
  imageUrl,
  highlighted,
  highlightLabel = 'Destaque',
  providerName,
  providerAvatarUrl,
  ctaLabel = 'Ver',
  variant = 'grid',
  className,
}: Readonly<ListingResultCardProps>) {
  if (variant === 'strip') {
    return (
      <Link
        href={href}
        className={cn(
          'group flex w-[260px] shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-md',
          className
        )}
      >
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-brand-soft to-secondary">
          {imageUrl && (
            <img
              src={imageUrl}
              alt={title}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          )}
          {highlighted && (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
              <Sparkles className="h-3 w-3" /> {highlightLabel}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3">
          <h3 className="line-clamp-1 text-sm font-bold leading-tight">{title}</h3>
          {subtitleLabel && (
            <p className="line-clamp-1 text-[11px] text-muted-foreground">{subtitleLabel}</p>
          )}
          <div className="mt-auto pt-1 text-sm font-black leading-none">{priceLabel}</div>
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
      leading={<ProviderRow providerName={providerName} providerAvatarUrl={providerAvatarUrl} />}
      footer={
        <>
          <div className="text-lg font-black leading-none">{priceLabel}</div>
          <span className="inline-flex shrink-0 items-center rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground transition group-hover:bg-brand/90">
            {ctaLabel}
          </span>
        </>
      }
    />
  );
}
