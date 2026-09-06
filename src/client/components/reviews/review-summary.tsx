'use client';

import { cn } from '../../../lib/utils';
import { RatingDisplay } from './rating-display';
import { useReviewStats } from './use-reviews';

type ReviewSummaryProps = {
  domain: string;
  referenceId: string;
  variant?: 'compact' | 'full';
  className?: string;
};

// i18n(track-e): reviews.summary.*
const STARS: Array<'5' | '4' | '3' | '2' | '1'> = ['5', '4', '3', '2', '1'];

function ptNumber(n: number, digits = 1): string {
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/**
 * Aggregate rating widget. **Only** reads `/api/resources/review_stats` — never
 * `/reviews` (see `useReviewStats`). Renders the empty state as a neutral "no
 * reviews yet" line rather than an error.
 */
export function ReviewSummary({
  domain,
  referenceId,
  variant = 'compact',
  className,
}: Readonly<ReviewSummaryProps>) {
  const { data, loading, error, reload } = useReviewStats(domain, referenceId);

  if (loading) {
    return (
      <div
        className={cn('h-5 w-32 animate-pulse rounded bg-muted', className)}
        aria-hidden="true"
      />
    );
  }

  if (error) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
        <span>Não foi possível carregar as avaliações.</span>
        <button
          type="button"
          onClick={() => void reload()}
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  const total = data?.totalReviews ?? 0;
  const average = data?.averageRating ?? 0;

  if (total === 0) {
    return (
      <span className={cn('text-sm text-muted-foreground', className)}>
        Ainda não há avaliações
      </span>
    );
  }

  if (variant === 'compact') {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-sm', className)}>
        <RatingDisplay value={average} size="sm" showValue />
        <span className="text-muted-foreground">
          · {total.toLocaleString('pt-BR')} {total === 1 ? 'avaliação' : 'avaliações'}
        </span>
      </span>
    );
  }

  const dist = data?.dist ?? { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };

  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8', className)}>
      <div className="flex flex-col items-center text-center">
        <span className="text-4xl font-black leading-none">{ptNumber(average)}</span>
        <RatingDisplay value={average} size="md" />
        <span className="mt-1 text-xs text-muted-foreground">
          {total.toLocaleString('pt-BR')} {total === 1 ? 'avaliação' : 'avaliações'}
        </span>
      </div>
      <div className="flex-1 space-y-1.5">
        {STARS.map((star) => {
          const value = dist[star] ?? 0;
          const pct = total > 0 ? Math.round((value / total) * 100) : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="w-3 text-muted-foreground">{star}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-8 text-right text-muted-foreground">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
