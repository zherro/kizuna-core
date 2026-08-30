'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { cn } from '../../../../lib/utils';

export type EntityViewMode = 'card' | 'list';

type EntityGridListProps<T> = {
  title: string;
  description?: string;
  items: T[];
  getKey: (item: T) => string;
  renderCard: (item: T) => ReactNode;
  renderRow: (item: T) => ReactNode;
  actions?: ReactNode;
  emptyState?: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
  storageKey?: string;
  cardGridClassName?: string;
};

function readStoredViewMode(storageKey: string): EntityViewMode {
  if (typeof window === 'undefined') return 'card';
  const stored = window.localStorage.getItem(storageKey);
  return stored === 'list' ? 'list' : 'card';
}

/**
 * Generic card/list toggle for entity collections (services, ads, and future
 * resources). Presentation-only: callers supply `renderCard`/`renderRow` and
 * own data fetching, filtering and actions.
 */
export function EntityGridList<T>({
  title,
  description,
  items,
  getKey,
  renderCard,
  renderRow,
  actions,
  emptyState,
  loading = false,
  loadingLabel = 'Carregando...',
  storageKey = 'entity-grid-view-mode',
  cardGridClassName = 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3',
}: Readonly<EntityGridListProps<T>>) {
  const [viewMode, setViewMode] = useState<EntityViewMode>('card');

  useEffect(() => {
    setViewMode(readStoredViewMode(storageKey));
  }, [storageKey]);

  function selectViewMode(mode: EntityViewMode) {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, mode);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => selectViewMode('card')}
              aria-label="Visualizar em cards"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition',
                viewMode === 'card'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <LayoutGrid className="h-4 w-4" /> Cards
            </button>
            <button
              type="button"
              onClick={() => selectViewMode('list')}
              aria-label="Visualizar em lista"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition',
                viewMode === 'list'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <List className="h-4 w-4" /> Lista
            </button>
          </div>
          {actions}
        </div>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">{loadingLabel}</p> : null}

      {!loading && items.length === 0 ? emptyState : null}

      {!loading && items.length > 0 ? (
        viewMode === 'card' ? (
          <div className={cardGridClassName}>
            {items.map((item) => (
              <div key={getKey(item)}>{renderCard(item)}</div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={getKey(item)}>{renderRow(item)}</div>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
