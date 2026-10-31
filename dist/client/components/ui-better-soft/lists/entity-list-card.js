import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from '../../../../lib/utils';
import { TONE_BORDER_L } from '../../../../lib/ui-tone';
export function EntityListCard({ leading, trailing, tone }) {
    return (_jsx("li", { className: cn('rounded-2xl border border-l-4 border-border bg-card p-4 shadow-sm', tone ? TONE_BORDER_L[tone] : 'border-l-border'), children: _jsxs("div", { className: "flex flex-wrap items-start justify-between gap-3", children: [_jsx("div", { className: "min-w-0 flex-1", children: leading }), trailing ? _jsx("div", { className: "flex flex-col items-end gap-2", children: trailing }) : null] }) }));
}
//# sourceMappingURL=entity-list-card.js.map