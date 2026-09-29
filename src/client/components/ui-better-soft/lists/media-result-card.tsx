import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '../../../../lib/utils';

type MediaResultCardProps = {
  /** Cover image URL. `null`/`undefined` shows the plain gradient background instead. */
  image?: string | null;
  imageAlt: string;
  /** e.g. a "sponsored"/"featured" badge. */
  badgeTopLeft?: ReactNode;
  /** e.g. a category badge. */
  badgeTopRight?: ReactNode;
  title: string;
  subtitle?: string;
  /** Row rendered between the title block and the footer — an avatar+name row, a rating, etc.
   * Caller builds the full content; the card only positions it. */
  leading?: ReactNode;
  /** Bottom row of the card — typically a price on the left and a CTA on the right. Caller
   * builds the full content; the card only provides the layout slot. */
  footer: ReactNode;
  /** When set, the whole card becomes a link (e.g. to the result's detail page). */
  href?: string;
  /** `'landscape'` (default, 3:2, `object-cover` full-bleed) or `'poster'` — capa em pé (ex.
   * cartaz de filme) num tile bem mais baixo (quadrado, ~33% menos alto que um 2:3 full-bleed
   * teria) com `object-contain`: a capa aparece inteira, sem cortar nem esticar, mesmo que sobre
   * moldura nas laterais. */
  imageAspect?: 'landscape' | 'poster';
  /** Quantas linhas o título pode ocupar antes de truncar. Default 2; `poster` costuma pedir 3
   * (títulos maiores, menos espaço horizontal por causa da capa em pé). */
  titleLines?: 2 | 3;
  className?: string;
};

export function MediaResultCard({
  image,
  imageAlt,
  badgeTopLeft,
  badgeTopRight,
  title,
  subtitle,
  leading,
  footer,
  href,
  imageAspect = 'landscape',
  titleLines = 2,
  className,
}: Readonly<MediaResultCardProps>) {
  const isPoster = imageAspect === 'poster';
  const content = (
    <>
      <div
        className={cn(
          'relative w-full overflow-hidden bg-gradient-to-br from-brand-soft to-secondary',
          isPoster ? 'aspect-square' : 'aspect-[3/2]'
        )}
      >
        {image && (
          <img
            src={image}
            alt={imageAlt}
            loading="lazy"
            className={cn(
              'h-full w-full transition duration-500 group-hover:scale-105',
              isPoster ? 'object-contain p-2' : 'object-cover'
            )}
          />
        )}
        {badgeTopLeft && <div className="absolute left-3 top-3">{badgeTopLeft}</div>}
        {badgeTopRight && <div className="absolute right-3 top-3">{badgeTopRight}</div>}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3
            className={cn(
              'text-base font-bold leading-tight',
              titleLines === 3 ? 'line-clamp-3' : 'line-clamp-2'
            )}
          >
            {title}
          </h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>

        {leading}

        <div className="mt-auto flex items-end justify-between gap-2 pt-1">{footer}</div>
      </div>
    </>
  );

  const cardClassName = cn(
    'group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-lg',
    className
  );

  if (href) {
    return (
      <Link href={href} className={cardClassName}>
        {content}
      </Link>
    );
  }

  return <article className={cardClassName}>{content}</article>;
}
