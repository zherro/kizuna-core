import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Star } from 'lucide-react';
import { cn } from '../../../lib/utils';
const ICON_SIZE = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-6 w-6',
};
const TEXT_SIZE = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
};
function ptNumber(n) {
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
/**
 * Read-only star rating. Fractional values render a partial last star via an
 * overlaid clipped copy. `aria-label` reads e.g. "4,7 de 5".
 */
export function RatingDisplay({ value, max = 5, size = 'md', showValue = false, count, }) {
    const safe = Math.max(0, Math.min(max, Number.isFinite(value) ? value : 0));
    const icon = ICON_SIZE[size];
    return (_jsxs("span", { className: cn('inline-flex items-center gap-1', TEXT_SIZE[size]), "aria-label": `${ptNumber(safe)} de ${max}`, role: "img", children: [_jsx("span", { className: "inline-flex", "aria-hidden": "true", children: Array.from({ length: max }, (_, index) => {
                    const fill = Math.max(0, Math.min(1, safe - index));
                    return (_jsxs("span", { className: "relative inline-block", children: [_jsx(Star, { className: cn(icon, 'text-muted-foreground/40') }), fill > 0 ? (_jsx("span", { className: "absolute inset-0 overflow-hidden", style: { width: `${fill * 100}%` }, children: _jsx(Star, { className: cn(icon, 'fill-current text-amber-500') }) })) : null] }, index));
                }) }), showValue ? _jsx("span", { className: "font-semibold", children: ptNumber(safe) }) : null, typeof count === 'number' ? (_jsxs("span", { className: "text-muted-foreground", children: ["\u00B7 ", count.toLocaleString('pt-BR')] })) : null] }));
}
//# sourceMappingURL=rating-display.js.map