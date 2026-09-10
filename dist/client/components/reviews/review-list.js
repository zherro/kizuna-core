'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Button } from '../ui/button';
import { cn } from '../../../lib/utils';
import { ReviewCard } from './review-card';
import { useReviewList } from './use-reviews';
// i18n(track-e): reviews.list.*
const FILTERS = [
    { id: 'all', label: 'Todas' },
    { id: '5', label: '5 estrelas' },
    { id: '4', label: '4 estrelas' },
    { id: '3', label: '3 estrelas' },
    { id: '2', label: '2 estrelas' },
    { id: '1', label: '1 estrela' },
];
const SORTS = [
    { id: 'recent', label: 'Mais recentes' },
    { id: 'oldest', label: 'Mais antigas' },
];
function Skeleton() {
    return (_jsx("div", { className: "space-y-3", "aria-hidden": "true", children: [0, 1, 2].map((i) => (_jsx("div", { className: "h-28 animate-pulse rounded-2xl bg-muted" }, i))) }));
}
export function ReviewList({ domain, referenceId, filter, sort, pageSize = 10, includeAllStatuses = false, renderItemActions, className, }) {
    const list = useReviewList(domain, referenceId, {
        filter,
        sort,
        pageSize,
        includeAllStatuses,
    });
    const totalPages = Math.max(1, Math.ceil(list.total / pageSize));
    return (_jsxs("div", { className: cn('space-y-4', className), children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [FILTERS.map((f) => (_jsx("button", { type: "button", onClick: () => list.setFilter(f.id), className: cn('rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors', list.filter === f.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background text-foreground hover:bg-accent'), children: f.label }, f.id))), _jsx("span", { className: "mx-1 h-4 w-px bg-border", "aria-hidden": "true" }), SORTS.map((s) => (_jsx("button", { type: "button", onClick: () => list.setSort(s.id), className: cn('rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors', list.sort === s.id
                            ? 'bg-secondary text-secondary-foreground'
                            : 'bg-background text-foreground hover:bg-accent'), children: s.label }, s.id)))] }), list.loading ? (_jsx(Skeleton, {})) : list.error ? (_jsxs("div", { className: "flex flex-col items-start gap-2 rounded-2xl border border-border bg-card p-4 text-sm", children: [_jsx("p", { className: "text-muted-foreground", children: list.error }), _jsx(Button, { type: "button", variant: "outline", size: "sm", onClick: () => void list.reload(), children: "Tentar de novo" })] })) : list.items.length === 0 ? (_jsxs("div", { className: "rounded-2xl border border-border bg-card p-8 text-center", children: [_jsx("p", { className: "text-sm font-medium", children: "Ainda n\u00E3o h\u00E1 avalia\u00E7\u00F5es" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Seja o primeiro a avaliar." })] })) : (_jsxs(_Fragment, { children: [_jsx("ul", { className: "space-y-3", children: list.items.map((review) => (_jsx("li", { children: _jsx(ReviewCard, { review: review, actions: renderItemActions ? renderItemActions(review) : undefined }) }, review.id))) }), totalPages > 1 ? (_jsxs("div", { className: "flex items-center justify-between pt-1", children: [_jsx(Button, { type: "button", variant: "outline", size: "sm", disabled: list.page <= 1, onClick: () => list.setPage(list.page - 1), children: "Anterior" }), _jsxs("span", { className: "text-xs text-muted-foreground", children: ["P\u00E1gina ", list.page, " de ", totalPages] }), _jsx(Button, { type: "button", variant: "outline", size: "sm", disabled: list.page >= totalPages, onClick: () => list.setPage(list.page + 1), children: "Pr\u00F3xima" })] })) : null] }))] }));
}
//# sourceMappingURL=review-list.js.map