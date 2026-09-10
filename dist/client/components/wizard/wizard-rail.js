'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Check } from 'lucide-react';
import { cn } from '../../../lib/utils';
function statusFor(index, current) {
    if (index < current)
        return 'done';
    if (index === current)
        return 'current';
    return 'todo';
}
function Disc({ status, n }) {
    return (_jsx("span", { className: cn('grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors', status === 'done' && 'bg-primary text-primary-foreground', status === 'current' && 'wz-disc-current bg-background text-primary', status === 'todo' && 'bg-muted text-muted-foreground'), children: status === 'done' ? _jsx(Check, { className: "h-3.5 w-3.5" }) : n }));
}
/** Vertical, clickable step list — desktop only (the narrow left column of the wizard). */
export function WizardRail({ steps, current, furthest, onJump, }) {
    return (_jsx("nav", { "aria-label": "Etapas", children: _jsx("ol", { className: "space-y-0.5", children: steps.map((step, index) => {
                const n = index + 1;
                const status = statusFor(n, current);
                const reachable = n <= furthest && n !== current;
                return (_jsx("li", { children: _jsxs("button", { type: "button", disabled: !reachable, "aria-current": status === 'current' ? 'step' : undefined, onClick: () => reachable && onJump(n), className: cn('flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors', reachable && 'hover:bg-muted/70', status === 'current' ? 'font-semibold text-foreground' : 'text-muted-foreground', !reachable && status !== 'current' && 'cursor-default'), children: [_jsx(Disc, { status: status, n: n }), _jsx("span", { className: "min-w-0 flex-1 truncate", children: step.label })] }) }, step.label));
            }) }) }));
}
/** Horizontal, clickable disc strip — mobile only (under the progress bar). */
export function WizardStrip({ steps, current, furthest, onJump, }) {
    return (_jsx("nav", { "aria-label": "Etapas", className: "-mx-1 overflow-x-auto", children: _jsx("ol", { className: "flex items-center gap-1 px-1", children: steps.map((step, index) => {
                const n = index + 1;
                const status = statusFor(n, current);
                const reachable = n <= furthest && n !== current;
                return (_jsxs("li", { className: "flex items-center", children: [_jsx("button", { type: "button", disabled: !reachable, "aria-current": status === 'current' ? 'step' : undefined, "aria-label": `Passo ${n}: ${step.label}`, onClick: () => reachable && onJump(n), className: cn('p-1', !reachable && 'cursor-default'), children: _jsx(Disc, { status: status, n: n }) }), index < steps.length - 1 ? (_jsx("span", { "aria-hidden": true, className: "h-px w-3 shrink-0 bg-border" })) : null] }, step.label));
            }) }) }));
}
//# sourceMappingURL=wizard-rail.js.map