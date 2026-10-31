'use client';

import { type ReactNode } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../../lib/utils';
import { RatingDisplay } from './rating-display';
import { ReviewTags } from './review-tags';
import type { ReviewView } from './types';

type ReviewCardProps = {
  review: ReviewView;
  canRequestModeration?: boolean;
  onRequestModeration?: (review: ReviewView) => void;
  /** Reserved: lets a caller override the mine-check done in the hook layer. */
  currentUserId?: string | null;
  actions?: ReactNode;
  className?: string;
};

// i18n(track-e): reviews.card.*
const REL_DIVISIONS: Array<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> = [
  { amount: 60, unit: 'seconds' },
  { amount: 60, unit: 'minutes' },
  { amount: 24, unit: 'hours' },
  { amount: 7, unit: 'days' },
  { amount: 4.34524, unit: 'weeks' },
  { amount: 12, unit: 'months' },
  { amount: Number.POSITIVE_INFINITY, unit: 'years' },
];

function relativeTimePtBr(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const formatter = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
  let duration = (date.getTime() - Date.now()) / 1000;
  for (const division of REL_DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return formatter.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return '';
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function ReviewCard({
  review,
  canRequestModeration = false,
  onRequestModeration,
  currentUserId,
  actions,
  className,
}: Readonly<ReviewCardProps>) {
  void currentUserId;
  const showPendingBadge = review.isMine && review.status === 'pending';
  const authorName = review.authorName || 'Cliente';

  return (
    <article className={cn('rounded-2xl border border-border bg-card p-4', className)}>
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
            {initials(authorName) || 'CL'}
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight">{authorName}</p>
            <p className="text-xs text-muted-foreground">{relativeTimePtBr(review.createdAt)}</p>
          </div>
        </div>
        {showPendingBadge ? (
          <Badge variant="secondary" className="shrink-0">
            Em análise
          </Badge>
        ) : null}
      </header>

      <div className="mt-3">
        <RatingDisplay value={review.rating} size="sm" />
      </div>

      {review.comment ? (
        <p className="mt-2 whitespace-pre-line text-sm text-foreground">{review.comment}</p>
      ) : null}

      {review.tags.length ? (
        <div className="mt-3">
          <ReviewTags tags={review.tags} readOnly />
        </div>
      ) : null}

      {(canRequestModeration && onRequestModeration) || actions ? (
        <footer className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {canRequestModeration && onRequestModeration ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onRequestModeration(review)}
            >
              Solicitar revisão
            </Button>
          ) : null}
          {actions}
        </footer>
      ) : null}
    </article>
  );
}
