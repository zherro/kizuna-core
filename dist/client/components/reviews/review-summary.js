'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from '../../../lib/utils';
import { RatingDisplay } from './rating-display';
import { useReviewStats } from './use-reviews';
// i18n(track-e): reviews.summary.*
const STARS = ['5', '4', '3', '2', '1'];
function ptNumber(n, digits = 1) {
    return n.toLocaleString('pt-BR', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    });
}
/**
 * Aggregate rating widget. **Only** reads `/api/resources/review_stats` — never
 * `/reviews` (see `useReviewStats`). Renders the empty state as a neutral "no
 * reviews yet" line rather than an error.
 */
export function ReviewSummary({ domain, referenceId, variant = 'compact', className, }) {
    const { data, loading, error, reload } = useReviewStats(domain, referenceId);
    if (loading) {
        return (_jsx("div", { className: cn('h-5 w-32 animate-pulse rounded bg-muted', className), "aria-hidden": "true" }));
    }
    if (error) {
        return (_jsxs("div", { className: cn('flex items-center gap-2 text-sm text-muted-foreground', className), children: [_jsx("span", { children: "N\u00E3o foi poss\u00EDvel carregar as avalia\u00E7\u00F5es." }), _jsx("button", { type: "button", onClick: () => void reload(), className: "font-medium text-primary underline-offset-2 hover:underline", children: "Tentar de novo" })] }));
    }
    const total = data?.totalReviews ?? 0;
    const average = data?.averageRating ?? 0;
    if (total === 0) {
        return (_jsx("span", { className: cn('text-sm text-muted-foreground', className), children: "Ainda n\u00E3o h\u00E1 avalia\u00E7\u00F5es" }));
    }
    if (variant === 'compact') {
        return (_jsxs("span", { className: cn('inline-flex items-center gap-1.5 text-sm', className), children: [_jsx(RatingDisplay, { value: average, size: "sm", showValue: true }), _jsxs("span", { className: "text-muted-foreground", children: ["\u00B7 ", total.toLocaleString('pt-BR'), " ", total === 1 ? 'avaliação' : 'avaliações'] })] }));
    }
    const dist = data?.dist ?? { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    return (_jsxs("div", { className: cn('flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8', className), children: [_jsxs("div", { className: "flex flex-col items-center text-center", children: [_jsx("span", { className: "text-4xl font-black leading-none", children: ptNumber(average) }), _jsx(RatingDisplay, { value: average, size: "md" }), _jsxs("span", { className: "mt-1 text-xs text-muted-foreground", children: [total.toLocaleString('pt-BR'), " ", total === 1 ? 'avaliação' : 'avaliações'] })] }), _jsx("div", { className: "flex-1 space-y-1.5", children: STARS.map((star) => {
                    const value = dist[star] ?? 0;
                    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                    return (_jsxs("div", { className: "flex items-center gap-2 text-xs", children: [_jsx("span", { className: "w-3 text-muted-foreground", children: star }), _jsx("div", { className: "h-2 flex-1 overflow-hidden rounded-full bg-muted", children: _jsx("div", { className: "h-full rounded-full bg-amber-500", style: { width: `${pct}%` } }) }), _jsx("span", { className: "w-8 text-right text-muted-foreground", children: value })] }, star));
                }) })] }));
}
//# sourceMappingURL=review-summary.js.map