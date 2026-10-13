'use client';

import { ChevronLeft } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { FilterIcon } from './filter-parts';

type Props = {
  /** Nome do grupo em vigor; sem ele, mostra `fallbackLabel` ("Todas as categorias"). */
  name?: string | null;
  icon?: string | null;
  fallbackLabel?: string;
  /** Sem `onClick` vira só um título (projeto sem grupos cadastrados). */
  onClick?: () => void;
  className?: string;
};

/**
 * O "herói" do filtro: o grupo atual como link grande no topo (`‹ Eventos`). Clicar abre a lista de
 * grupos pra trocar. Marca-se com `data-autofocus` pro painel devolver o foco aqui ao voltar.
 */
export function FilterGroupLink({
  name,
  icon,
  fallbackLabel = 'Todas as categorias',
  onClick,
  className,
}: Props) {
  const label = name?.trim() || fallbackLabel;
  const body = (
    <>
      {onClick && (
        <ChevronLeft
          aria-hidden="true"
          className="size-6 shrink-0 transition-transform duration-150 group-hover:-translate-x-0.5 motion-reduce:transition-none sm:size-5"
        />
      )}
      <FilterIcon name={icon} className="size-6 shrink-0 sm:size-5" />
      <span className="min-w-0 flex-1">
        <span className="block break-words text-xl font-bold leading-tight sm:text-lg">{label}</span>
        {onClick && (
          <span className="block text-xs font-normal text-muted-foreground">Trocar de grupo</span>
        )}
      </span>
    </>
  );

  if (!onClick) {
    return (
      <div className={cn('flex min-h-12 items-center gap-2 px-1 text-primary', className)}>
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      data-autofocus
      aria-label={`${label}, trocar de grupo`}
      className={cn(
        'group flex min-h-12 w-full items-center gap-2 rounded-[var(--ui-radius-card-sm,0.5rem)] px-1 py-1.5 text-left text-primary outline-none transition-colors duration-150',
        'hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring active:bg-primary/15 motion-reduce:transition-none',
        className
      )}
    >
      {body}
    </button>
  );
}
