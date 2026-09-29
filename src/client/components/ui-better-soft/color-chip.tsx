// soft-theme: raio via var(--ui-radius-control) (globals.css) — classic/soft via data-ui-style
import type { ReactNode } from 'react';
import { cn } from '../../../lib/utils';

type ColorChipProps = {
  /** CSS color value — quem chama resolve a cor, o chip não conhece o domínio. */
  color: string;
  children: ReactNode;
  className?: string;
};

/**
 * Chip circular colorido via `color-mix`, no lugar de um badge com borda — usado por exemplo para
 * o horário de um compromisso. O raio vem do token `--ui-radius-control`, que troca por
 * `data-ui-style` (`NEXT_PUBLIC_UI_STYLE`).
 */
export function ColorChip({ color, children, className }: Readonly<ColorChipProps>) {
  return (
    <div
      className={cn(
        'grid size-11 shrink-0 place-items-center rounded-[var(--ui-radius-control,0.5rem)] text-sm font-bold',
        className
      )}
      style={{
        backgroundColor: `color-mix(in oklch, ${color} 18%, var(--color-background))`,
        color,
      }}
    >
      {children}
    </div>
  );
}
