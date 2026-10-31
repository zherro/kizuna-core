'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import * as React from 'react';
import { cn } from '../../../lib/utils';
const RadioGroupContext = React.createContext(null);
let groupCounter = 0;
export function RadioGroup({ value, onValueChange, disabled, className, children, }) {
    const name = React.useMemo(() => `radio-group-${(groupCounter += 1)}`, []);
    return (_jsx(RadioGroupContext.Provider, { value: { value, onValueChange, name, disabled }, children: _jsx("div", { role: "radiogroup", className: cn('grid gap-2', className), children: children }) }));
}
export function RadioGroupItem({ value, id, className, }) {
    const ctx = React.useContext(RadioGroupContext);
    if (!ctx)
        throw new Error('RadioGroupItem must be used within RadioGroup');
    const checked = ctx.value === value;
    return (_jsx("button", { type: "button", role: "radio", id: id, "aria-checked": checked, disabled: ctx.disabled, onClick: () => ctx.onValueChange?.(value), className: cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-primary text-primary shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50', className), children: checked && _jsx("span", { className: "h-2 w-2 rounded-full bg-primary" }) }));
}
//# sourceMappingURL=radio-group.js.map