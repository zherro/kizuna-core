'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from '../../../lib/utils';
// larguras/lados fixos (sem random) pra não trocar entre renders
const ROWS = [
    { mine: false, w: '60%' },
    { mine: false, w: '42%' },
    { mine: true, w: '55%' },
    { mine: false, w: '70%' },
    { mine: true, w: '38%' },
    { mine: true, w: '64%' },
    { mine: false, w: '48%' },
];
export function MessageListSkeleton() {
    return (_jsxs("div", { className: "flex-1 space-y-3 overflow-hidden p-4", "aria-hidden": "true", children: [_jsx("div", { className: "flex justify-center", children: _jsx("div", { className: "h-5 w-20 animate-pulse rounded-full bg-muted" }) }), ROWS.map((row, i) => (_jsx("div", { className: cn('flex', row.mine ? 'justify-end' : 'justify-start'), children: _jsx("div", { className: cn('h-10 animate-pulse rounded-2xl', row.mine ? 'rounded-br-md bg-primary/20' : 'rounded-bl-md bg-muted'), style: { width: row.w } }) }, i)))] }));
}
//# sourceMappingURL=message-list-skeleton.js.map