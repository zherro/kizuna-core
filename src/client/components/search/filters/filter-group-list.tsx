'use client';

import { ChevronRight, LayoutGrid } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import type { FilterGroup } from './filter-taxonomy';
import { FilterIcon } from './filter-parts';

type Props = {
  groups: FilterGroup[];
  /** slug do grupo em vigor; `null` = "Todas as categorias" */
  activeSlug: string | null;
  /** `null` = limpar o grupo ("Todas as categorias") */
  onSelect: (slug: string | null) => void;
  allLabel?: string;
};

const ROW =
  'group flex min-h-12 w-full items-center gap-3 rounded-[var(--ui-radius-card-sm,0.5rem)] px-3 py-2 text-left text-lg outline-none transition-colors duration-150 ' +
  'hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring active:bg-primary/10 motion-reduce:transition-none sm:min-h-10 sm:text-base';

/**
 * Visão "trocar de grupo": lista de botões grandes (ícone + nome + chevron), com "Todas as
 * categorias" no topo. O item em vigor leva `aria-current` e é o alvo do foco ao abrir a visão.
 */
export function FilterGroupList({ groups, activeSlug, onSelect, allLabel = 'Todas as categorias' }: Props) {
  return (
    <ul className="flex flex-col gap-0.5" aria-label="Grupos de categorias">
      <li>
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-current={activeSlug === null ? 'true' : undefined}
          data-autofocus={activeSlug === null ? true : undefined}
          className={cn(ROW, activeSlug === null && 'bg-primary/10 font-semibold text-primary')}
        >
          <LayoutGrid aria-hidden="true" className="size-6 shrink-0 sm:size-5" />
          <span className="min-w-0 flex-1 break-words leading-snug">{allLabel}</span>
        </button>
      </li>
      {groups.map((group) => {
        const active = group.slug === activeSlug;
        return (
          <li key={group.id}>
            <button
              type="button"
              onClick={() => onSelect(group.slug)}
              aria-current={active ? 'true' : undefined}
              data-autofocus={active ? true : undefined}
              className={cn(ROW, active && 'bg-primary/10 font-semibold text-primary')}
            >
              <FilterIcon name={group.icon} className="size-6 shrink-0 sm:size-5" />
              <span className="min-w-0 flex-1 break-words leading-snug">{group.name}</span>
              <ChevronRight
                aria-hidden="true"
                className="size-5 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none sm:size-4"
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
