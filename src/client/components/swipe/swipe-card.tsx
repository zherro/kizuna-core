'use client';

import { Star } from 'lucide-react';
import type { ServiceResult } from '../search/search-types';
import { formatCurrency } from '../../../lib/shared/currency-mask';
import { formatLocationLabel } from '../search/format-location-label';
import { PRICE_UNIT_LABEL } from '../services/service-labels';

export function priceLabel(r: { price: number | null; price_type: string }): string {
  const isQuote = r.price_type === 'quote' || r.price == null || Number(r.price) <= 0;
  if (isQuote) return 'Sob consulta';
  const unit = PRICE_UNIT_LABEL[r.price_type] ?? '';
  return `${formatCurrency(Number(r.price))}${unit ? ` ${unit}` : ''}`;
}

export function coverUrl(fileId: string | null): string | null {
  return fileId ? `/api/public/storage/files/${fileId}/content` : null;
}

type Props = {
  item: ServiceResult;
  dragX?: number;
  className?: string;
  style?: React.CSSProperties;
  handlers?: React.DOMAttributes<HTMLElement>;
};

export function SwipeCard({ item, dragX = 0, className = '', style, handlers }: Props) {
  const img = coverUrl(item.cover_file_id);
  const location = formatLocationLabel(item);
  return (
    <article
      {...handlers}
      style={style}
      className={`absolute inset-0 overflow-hidden rounded-3xl border border-border bg-card ${className}`}
    >
      {img ? (
        <img src={img} alt={item.title} className="pointer-events-none h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full bg-muted" />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/25 to-transparent" />

      <span
        className="pointer-events-none absolute left-4 top-4 rounded-lg border-2 border-primary px-3 py-1 text-sm font-bold uppercase text-primary"
        style={{ opacity: Math.max(0, Math.min(1, dragX / 110)) }}
      >
        Curtir
      </span>
      <span
        className="pointer-events-none absolute right-4 top-4 rounded-lg border-2 border-destructive px-3 py-1 text-sm font-bold uppercase text-destructive"
        style={{ opacity: Math.max(0, Math.min(1, -dragX / 110)) }}
      >
        Passar
      </span>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 p-5">
        {item.category ? (
          <span className="rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold text-foreground">
            {item.category}
          </span>
        ) : null}
        <h2 className="mt-3 font-serif text-2xl font-bold text-background">{item.title}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-background/90">
          <span className="font-semibold">{priceLabel(item)}</span>
          {location ? <span>{location}</span> : null}
          {item.provider_name ? <span>{item.provider_name}</span> : null}
          {item.rating != null ? (
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-current" /> {Number(item.rating).toFixed(1)} ({item.reviews})
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
