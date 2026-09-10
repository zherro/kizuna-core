'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from '../../../lib/utils';
export function Stepper({ steps, value, onValueChange, className }) {
    return (_jsx("div", { className: cn('grid gap-2 sm:grid-flow-col sm:auto-cols-fr', className), role: "tablist", "aria-label": "Etapas do formulario", children: steps.map((step, index) => {
            const active = step.id === value;
            const disabled = Boolean(step.disabled);
            const canSelect = !disabled && !active;
            return (_jsx("button", { type: "button", role: "tab", "aria-selected": active, "aria-disabled": disabled, disabled: disabled, onClick: () => {
                    if (canSelect) {
                        onValueChange(step.id);
                    }
                }, className: cn('rounded-md border px-3 py-2 text-left text-sm transition', active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:bg-accent', disabled && 'cursor-not-allowed opacity-50'), children: _jsxs("div", { className: "flex items-start gap-3", children: [_jsx("span", { className: cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold', active
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-background text-foreground'), children: index + 1 }), _jsxs("div", { className: "min-w-0 space-y-0.5", children: [_jsx("p", { className: "font-semibold", children: step.title }), step.description ? _jsx("p", { className: "text-xs leading-5", children: step.description }) : null] })] }) }, step.id));
        }) }));
}
//# sourceMappingURL=stepper.js.map