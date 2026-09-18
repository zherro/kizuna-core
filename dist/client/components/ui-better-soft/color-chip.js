import { jsx as _jsx } from "react/jsx-runtime";
import { activeTheme } from '../../lib/ui-theme';
import { cn } from '../../../lib/utils';
/**
 * Chip circular colorido via `color-mix`, no lugar de um badge com borda — usado por exemplo para
 * o horário de um compromisso. O raio vem de `activeTheme.chip`, resolvido por
 * `NEXT_PUBLIC_UI_STYLE`.
 */
export function ColorChip({ color, children, className }) {
    return (_jsx("div", { className: cn('grid size-11 shrink-0 place-items-center text-sm font-bold', activeTheme.chip, className), style: {
            backgroundColor: `color-mix(in oklch, ${color} 18%, var(--color-background))`,
            color,
        }, children: children }));
}
//# sourceMappingURL=color-chip.js.map