import type { ReactNode } from 'react';
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
export declare function ColorChip({ color, children, className }: Readonly<ColorChipProps>): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=color-chip.d.ts.map