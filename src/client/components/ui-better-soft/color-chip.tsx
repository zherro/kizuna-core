// soft-theme: lê activeTheme (kizuna-core/src/client/lib/ui-theme.ts) — classic/soft via NEXT_PUBLIC_UI_STYLE
import type { ReactNode } from 'react';
import { activeTheme } from '../../lib/ui-theme';
import { cn } from '../../../lib/utils';

type ColorChipProps = {
  /** CSS color value — quem chama resolve a cor, o chip não conhece o domínio. */
  color: string;
  children: ReactNode;
  className?: string;
};

/**
 * Chip circular colorido via `color-mix`, no lugar de um badge com borda — usado por exemplo para
 * o horário de um compromisso. O raio vem de `activeTheme.chip`, resolvido por
 * `NEXT_PUBLIC_UI_STYLE`.
 */
export function ColorChip({ color, children, className }: Readonly<ColorChipProps>) {
  return (
    <div
      className={cn(
        'grid size-11 shrink-0 place-items-center text-sm font-bold',
        activeTheme.chip,
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
