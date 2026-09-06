'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import * as React from 'react';
import { ChevronDown } from 'lucide-react';
const SelectContext = React.createContext(undefined);
const useSelectContext = () => {
    const context = React.useContext(SelectContext);
    if (!context)
        throw new Error('useSelectContext must be used within Select');
    return context;
};
const Select = ({ value, onValueChange, children }) => {
    const [open, setOpen] = React.useState(false);
    return (_jsx(SelectContext.Provider, { value: { open, onOpenChange: setOpen, value, onValueChange }, children: children }));
};
const SelectTrigger = React.forwardRef(({ className = '', children, ...props }, ref) => {
    const { open, onOpenChange } = useSelectContext();
    return (_jsxs("button", { ref: ref, onClick: () => onOpenChange(!open), className: `flex items-center justify-between rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${className}`, ...props, children: [children, _jsx(ChevronDown, { className: "h-4 w-4 ml-1 opacity-50" })] }));
});
SelectTrigger.displayName = 'SelectTrigger';
const SelectValue = ({ children }) => {
    const { value } = useSelectContext();
    return children || value;
};
SelectValue.displayName = 'SelectValue';
const SelectContent = ({ children }) => {
    const { open, onOpenChange } = useSelectContext();
    if (!open)
        return null;
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed inset-0 z-40", onClick: () => onOpenChange(false) }), _jsx("div", { className: "absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-border bg-card shadow-lg", children: children })] }));
};
SelectContent.displayName = 'SelectContent';
const SelectItem = ({ value, children }) => {
    const { onValueChange, onOpenChange } = useSelectContext();
    const handleSelect = () => {
        onValueChange?.(value);
        onOpenChange(false);
    };
    return (_jsx("button", { onClick: handleSelect, className: "block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors", children: children }));
};
SelectItem.displayName = 'SelectItem';
export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
//# sourceMappingURL=select.js.map