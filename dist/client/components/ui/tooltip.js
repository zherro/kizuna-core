'use client';
import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { cn } from '../../../lib/utils';
/**
 * CSS/state tooltip (no @radix-ui/react-tooltip in the dependency set).
 * `<Tooltip content={...}>` wraps a trigger; the tip shows on hover/focus.
 */
export function Tooltip({ content, children, className, side = 'top', }) {
    const [open, setOpen] = React.useState(false);
    if (!content)
        return _jsx(_Fragment, { children: children });
    return (_jsxs("span", { className: cn('relative inline-flex items-center', className), onMouseEnter: () => setOpen(true), onMouseLeave: () => setOpen(false), onFocus: () => setOpen(true), onBlur: () => setOpen(false), children: [children, open && (_jsx("span", { role: "tooltip", className: cn('pointer-events-none absolute left-1/2 z-50 w-max max-w-xs -translate-x-1/2 rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md', side === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'), children: content }))] }));
}
//# sourceMappingURL=tooltip.js.map