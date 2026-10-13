'use client';

import { cn } from '../../../../lib/utils';
import type { SubcategoryBlock } from './filter-taxonomy';
import { Enter, useFlipList, useMountedFlag } from './filter-motion';

type Props = {
  blocks: SubcategoryBlock[];
  selectedIds: number[];
  onToggle: (subcategoryId: number) => void;
  /**
   * Mostra o nome da categoria acima de cada bloco. O painel liga isso só quando há mais de uma
   * categoria marcada (com uma só, o título "Especialidades" já diz de quem são).
   */
  showCategoryLabel?: boolean;
};

function ChipBlock({
  block,
  selectedIds,
  onToggle,
  showLabel,
  animateEntry,
}: {
  block: SubcategoryBlock;
  selectedIds: number[];
  onToggle: (id: number) => void;
  showLabel: boolean;
  animateEntry: boolean;
}) {
  const ref = useFlipList<HTMLDivElement>(block.subs.map((s) => s.id).join(','));
  const selected = new Set(selectedIds);
  const ready = useMountedFlag();

  return (
    <Enter variant="rise" animate={animateEntry} className="flex flex-col gap-1.5">
      {showLabel && (
        <p className="px-0.5 text-xs font-medium text-muted-foreground">{block.category.name}</p>
      )}
      <div
        ref={ref}
        role="group"
        aria-label={`Especialidades de ${block.category.name}`}
        className="relative flex flex-wrap gap-2"
      >
        {block.subs.map((sub) => {
          const on = selected.has(sub.id);
          return (
            <Enter
              key={sub.id}
              as="span"
              variant="pop"
              duration={180}
              animate={ready}
              className="inline-flex"
            >
              <button
                type="button"
                aria-pressed={on}
                data-flip-key={sub.id}
                onClick={() => onToggle(sub.id)}
                className={cn(
                  'inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm outline-none transition-colors duration-150 sm:min-h-8 sm:px-3 sm:py-1 sm:text-xs',
                  'focus-visible:ring-2 focus-visible:ring-ring active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100',
                  on
                    ? 'bg-primary font-semibold text-primary-foreground hover:bg-primary/90'
                    : 'bg-muted text-foreground shadow-[inset_0_0_0_1px_var(--border)] hover:bg-primary/10'
                )}
              >
                {sub.name}
              </button>
            </Enter>
          );
        })}
      </div>
    </Enter>
  );
}

/**
 * Especialidades (subcategorias) das categorias marcadas: chips de alternar, marcadas primeiro.
 * Recebe os blocos prontos (`subcategoryBlocks`) — não conhece a taxonomia nem a URL.
 */
export function FilterSubcategoryChips({
  blocks,
  selectedIds,
  onToggle,
  showCategoryLabel = blocks.length > 1,
}: Props) {
  const ready = useMountedFlag();
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block) => (
        <ChipBlock
          key={block.category.id}
          block={block}
          selectedIds={selectedIds}
          onToggle={onToggle}
          showLabel={showCategoryLabel}
          animateEntry={ready}
        />
      ))}
    </div>
  );
}
