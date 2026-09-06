'use client';

import { type ReactNode } from 'react';
import { Button } from '../ui/button';
import { cn } from '../../../lib/utils';
import { ReviewCard } from './review-card';
import { useReviewList } from './use-reviews';
import type { ReviewListFilter, ReviewListSort, ReviewView } from './types';

type ReviewListProps = {
  domain: string;
  referenceId: string;
  filter?: ReviewListFilter;
  sort?: ReviewListSort;
  pageSize?: number;
  /** Admin/moderation views pass this to drop the `status=published` pin. */
  includeAllStatuses?: boolean;
  renderItemActions?: (review: ReviewView) => ReactNode;
  className?: string;
};

// i18n(track-e): reviews.list.*
const FILTERS: Array<{ id: ReviewListFilter; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: '5', label: '5 estrelas' },
  { id: '4', label: '4 estrelas' },
  { id: '3', label: '3 estrelas' },
  { id: '2', label: '2 estrelas' },
  { id: '1', label: '1 estrela' },
];

const SORTS: Array<{ id: ReviewListSort; label: string }> = [
  { id: 'recent', label: 'Mais recentes' },
  { id: 'oldest', label: 'Mais antigas' },
];

function Skeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  );
}

export function ReviewList({
  domain,
  referenceId,
  filter,
  sort,
  pageSize = 10,
  includeAllStatuses = false,
  renderItemActions,
  className,
}: Readonly<ReviewListProps>) {
  const list = useReviewList(domain, referenceId, {
    filter,
    sort,
    pageSize,
    includeAllStatuses,
  });

  const totalPages = Math.max(1, Math.ceil(list.total / pageSize));

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => list.setFilter(f.id)}
            className={cn(
              'rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors',
              list.filter === f.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-foreground hover:bg-accent'
            )}
          >
            {f.label}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
        {SORTS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => list.setSort(s.id)}
            className={cn(
              'rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors',
              list.sort === s.id
                ? 'bg-secondary text-secondary-foreground'
                : 'bg-background text-foreground hover:bg-accent'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {list.loading ? (
        <Skeleton />
      ) : list.error ? (
        <div className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-card p-4 text-sm">
          <p className="text-muted-foreground">{list.error}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void list.reload()}>
            Tentar de novo
          </Button>
        </div>
      ) : list.items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm font-medium">Ainda não há avaliações</p>
          <p className="mt-1 text-sm text-muted-foreground">Seja o primeiro a avaliar.</p>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {list.items.map((review) => (
              <li key={review.id}>
                <ReviewCard
                  review={review}
                  actions={renderItemActions ? renderItemActions(review) : undefined}
                />
              </li>
            ))}
          </ul>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={list.page <= 1}
                onClick={() => list.setPage(list.page - 1)}
              >
                Anterior
              </Button>
              <span className="text-xs text-muted-foreground">
                Página {list.page} de {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={list.page >= totalPages}
                onClick={() => list.setPage(list.page + 1)}
              >
                Próxima
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
