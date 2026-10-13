'use client';

import { Check } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { selectedFirst, type FilterCategory } from './filter-taxonomy';
import { useFlipList } from './filter-motion';
import { CountBadge, FilterIcon } from './filter-parts';

type Props = {
  categories: FilterCategory[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  /** "desmarcar todas" — aparece quando há ao menos uma marcada */
  onClear?: () => void;
  /** nome do grupo, só para o rótulo de acessibilidade da lista */
  groupLabel?: string;
};

/**
 * Categorias do grupo: multi-seleção com marcação animada. As marcadas sobem para o topo com fundo
 * e barra na cor primária; a troca de lugar desliza (FLIP). Cada item é um `role="checkbox"`.
 */
export function FilterCategoryList({ categories, selectedIds, onToggle, onClear, groupLabel }: Props) {
  const ordered = selectedFirst(categories, selectedIds);
  const selected = new Set(selectedIds);
  const selectedCount = ordered.filter((c) => selected.has(c.id)).length;
  const listRef = useFlipList<HTMLDivElement>(ordered.map((c) => c.id).join(','));

  return (
    <div className="flex flex-col gap-1">
      <div className="flex min-h-6 items-center justify-between gap-2 px-1">
        {selectedCount > 0 ? (
          <CountBadge>
            {selectedCount === 1 ? '1 selecionada' : `${selectedCount} selecionadas`}
          </CountBadge>
        ) : (
          <p className="text-xs text-muted-foreground">
            {categories.length === 1 ? '1 categoria' : `${categories.length} categorias`}
          </p>
        )}
        {selectedCount > 0 && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="-mr-2 inline-flex min-h-11 items-center rounded px-2 text-sm text-muted-foreground underline-offset-2 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring sm:min-h-7 sm:text-xs"
          >
            desmarcar
          </button>
        )}
      </div>

      <div
        ref={listRef}
        role="group"
        aria-label={groupLabel ? `Categorias de ${groupLabel}` : 'Categorias'}
        className="relative flex flex-col gap-0.5"
      >
        {ordered.map((category) => {
          const checked = selected.has(category.id);
          return (
            <button
              key={category.id}
              type="button"
              role="checkbox"
              aria-checked={checked}
              data-flip-key={category.id}
              data-autofocus={checked ? true : undefined}
              onClick={() => onToggle(category.id)}
              className={cn(
                'relative flex min-h-11 w-full items-center gap-3 overflow-hidden rounded-[var(--ui-radius-card-sm,0.5rem)] px-3 py-2 text-left text-base outline-none',
                'transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100 sm:min-h-9 sm:py-1.5 sm:text-sm',
                checked
                  ? 'bg-primary/10 font-semibold text-foreground hover:bg-primary/15'
                  : 'text-foreground hover:bg-muted active:bg-muted'
              )}
            >
              {/* barra primária à esquerda (não depende de utilitário de border-color) */}
              <span
                aria-hidden="true"
                className={cn(
                  'absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-primary transition-transform duration-200 ease-out motion-reduce:transition-none',
                  checked ? 'scale-y-100' : 'scale-y-0'
                )}
              />
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-md transition-colors duration-150 motion-reduce:transition-none',
                  checked
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background shadow-[inset_0_0_0_1.5px_var(--muted-foreground)]'
                )}
              >
                <Check
                  strokeWidth={3}
                  className={cn(
                    'size-3.5 transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none',
                    checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                  )}
                />
              </span>
              <FilterIcon
                name={category.icon}
                className={cn(
                  'size-4 shrink-0 transition-colors duration-150',
                  checked ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              <span className="min-w-0 flex-1 break-words leading-snug">{category.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
