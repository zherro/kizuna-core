'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { cn } from '../../../lib/utils';
import { RatingDisplay } from './rating-display';
import { ReviewTags } from './review-tags';
// i18n(track-e): reviews.card.*
const REL_DIVISIONS = [
    { amount: 60, unit: 'seconds' },
    { amount: 60, unit: 'minutes' },
    { amount: 24, unit: 'hours' },
    { amount: 7, unit: 'days' },
    { amount: 4.34524, unit: 'weeks' },
    { amount: 12, unit: 'months' },
    { amount: Number.POSITIVE_INFINITY, unit: 'years' },
];
function relativeTimePtBr(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime()))
        return '';
    const formatter = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
    let duration = (date.getTime() - Date.now()) / 1000;
    for (const division of REL_DIVISIONS) {
        if (Math.abs(duration) < division.amount) {
            return formatter.format(Math.round(duration), division.unit);
        }
        duration /= division.amount;
    }
    return '';
}
function initials(name) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');
}
export function ReviewCard({ review, canRequestModeration = false, onRequestModeration, currentUserId, actions, className, }) {
    void currentUserId;
    const showPendingBadge = review.isMine && review.status === 'pending';
    const authorName = review.authorName || 'Cliente';
    return (_jsxs("article", { className: cn('rounded-2xl border border-border bg-card p-4', className), children: [_jsxs("header", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("span", { className: "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground", children: initials(authorName) || 'CL' }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold leading-tight", children: authorName }), _jsx("p", { className: "text-xs text-muted-foreground", children: relativeTimePtBr(review.createdAt) })] })] }), showPendingBadge ? (_jsx(Badge, { variant: "secondary", className: "shrink-0", children: "Em an\u00E1lise" })) : null] }), _jsx("div", { className: "mt-3", children: _jsx(RatingDisplay, { value: review.rating, size: "sm" }) }), review.comment ? (_jsx("p", { className: "mt-2 whitespace-pre-line text-sm text-foreground", children: review.comment })) : null, review.tags.length ? (_jsx("div", { className: "mt-3", children: _jsx(ReviewTags, { tags: review.tags, readOnly: true }) })) : null, (canRequestModeration && onRequestModeration) || actions ? (_jsxs("footer", { className: "mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3", children: [canRequestModeration && onRequestModeration ? (_jsx(Button, { type: "button", variant: "outline", size: "sm", onClick: () => onRequestModeration(review), children: "Solicitar revis\u00E3o" })) : null, actions] })) : null] }));
}
//# sourceMappingURL=review-card.js.map