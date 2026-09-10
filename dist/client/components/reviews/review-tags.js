'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '../../../lib/utils';
/**
 * Wrapping chip list. Two modes:
 *  - selection (`onToggle` + `selected`) — used inside `ReviewModal`;
 *  - display (`readOnly`) — used inside `ReviewCard`.
 * Colored state uses `bg-*`/`text-*` (border-color utilities are dead here).
 */
export function ReviewTags({ tags, selected = [], onToggle, readOnly = false, }) {
    if (!tags.length)
        return null;
    return (_jsx("div", { className: "flex flex-wrap gap-2", children: tags.map((tag) => {
            const isSelected = selected.includes(tag.slug);
            const base = 'inline-flex items-center rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors';
            if (readOnly || !onToggle) {
                return (_jsx("span", { className: cn(base, 'bg-muted text-muted-foreground'), children: tag.label }, tag.slug));
            }
            return (_jsx("button", { type: "button", role: "checkbox", "aria-checked": isSelected, onClick: () => onToggle(tag.slug), className: cn(base, 'cursor-pointer', isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-foreground hover:bg-accent'), children: tag.label }, tag.slug));
        }) }));
}
//# sourceMappingURL=review-tags.js.map