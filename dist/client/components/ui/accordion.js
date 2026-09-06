'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../../lib/utils';
const AccordionContext = React.createContext(null);
function useAccordionContext() {
    const ctx = React.useContext(AccordionContext);
    if (!ctx)
        throw new Error('Accordion.* must be used within <Accordion>');
    return ctx;
}
export function Accordion({ type = 'single', collapsible = true, defaultValue, className, children, }) {
    const [open, setOpen] = React.useState(() => {
        if (Array.isArray(defaultValue))
            return defaultValue;
        if (typeof defaultValue === 'string')
            return [defaultValue];
        return [];
    });
    const toggle = React.useCallback((value) => {
        setOpen((current) => {
            const has = current.includes(value);
            if (type === 'multiple') {
                return has ? current.filter((v) => v !== value) : [...current, value];
            }
            if (has)
                return collapsible ? [] : current;
            return [value];
        });
    }, [type, collapsible]);
    const ctx = React.useMemo(() => ({ isOpen: (value) => open.includes(value), toggle }), [open, toggle]);
    return (_jsx(AccordionContext.Provider, { value: ctx, children: _jsx("div", { className: cn('divide-y divide-border', className), children: children }) }));
}
const ItemContext = React.createContext('');
export function AccordionItem({ value, className, children, }) {
    return (_jsx(ItemContext.Provider, { value: value, children: _jsx("div", { className: cn('py-1', className), children: children }) }));
}
export function AccordionTrigger({ className, children, }) {
    const { isOpen, toggle } = useAccordionContext();
    const value = React.useContext(ItemContext);
    const open = isOpen(value);
    return (_jsxs("button", { type: "button", onClick: () => toggle(value), "aria-expanded": open, className: cn('flex w-full items-center justify-between gap-2 py-2 text-left text-sm font-medium transition-colors hover:text-foreground/80', className), children: [children, _jsx(ChevronDown, { className: cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180') })] }));
}
export function AccordionContent({ className, children, }) {
    const { isOpen } = useAccordionContext();
    const value = React.useContext(ItemContext);
    if (!isOpen(value))
        return null;
    return _jsx("div", { className: cn('pb-3 pt-1 text-sm', className), children: children });
}
//# sourceMappingURL=accordion.js.map