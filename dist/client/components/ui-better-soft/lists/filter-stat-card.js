'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from '../../../../lib/utils';
import { TONE_TEXT } from '../../../../lib/ui-tone';
export function FilterStatCard({ label, value, active, onClick, tone = 'muted', }) {
    return (_jsxs("button", { type: "button", onClick: onClick, className: cn('rounded-xl border p-3 text-left transition', active
            ? 'border-brand bg-brand-soft ring-1 ring-brand'
            : 'border-border bg-card hover:bg-muted/40'), children: [_jsx("div", { className: "text-[11px] uppercase tracking-wide text-muted-foreground", children: label }), _jsx("div", { className: cn('mt-1 text-2xl font-black', TONE_TEXT[tone]), children: value })] }));
}
//# sourceMappingURL=filter-stat-card.js.map