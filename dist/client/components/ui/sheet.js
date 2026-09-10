'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
const SheetContext = React.createContext(undefined);
const useSheet = () => {
    const context = React.useContext(SheetContext);
    if (!context)
        throw new Error('useSheet must be used within SheetProvider');
    return context;
};
const Sheet = ({ children, open: controlledOpen, onOpenChange }) => {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : uncontrolledOpen;
    const setOpen = isControlled ? onOpenChange : setUncontrolledOpen;
    return (_jsx(SheetContext.Provider, { value: { open, onOpenChange: setOpen }, children: children }));
};
const SheetTrigger = React.forwardRef(({ asChild, ...props }, ref) => {
    const { onOpenChange } = useSheet();
    const handleClick = (e) => {
        onOpenChange(true);
        props.onClick?.(e);
    };
    if (asChild && React.isValidElement(props.children)) {
        return React.cloneElement(props.children, {
            onClick: handleClick,
        });
    }
    return _jsx("button", { ref: ref, onClick: handleClick, ...props });
});
SheetTrigger.displayName = 'SheetTrigger';
const SheetContent = React.forwardRef(({ side = 'right', className = '', children, ...props }, ref) => {
    const { open, onOpenChange } = useSheet();
    const sideClasses = {
        top: 'top-0 left-0 right-0 rounded-b-2xl',
        right: 'right-0 top-0 bottom-0 w-full max-w-md rounded-l-2xl',
        bottom: 'bottom-0 left-0 right-0 rounded-t-2xl',
        left: 'left-0 top-0 bottom-0 w-full max-w-md rounded-r-2xl',
    };
    if (!open)
        return null;
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed inset-0 z-40 bg-black/30", onClick: () => onOpenChange(false) }), _jsx("div", { ref: ref, className: `fixed z-50 border border-border bg-background shadow-lg overflow-y-auto ${sideClasses[side]} ${className}`, ...props, children: children })] }));
});
SheetContent.displayName = 'SheetContent';
const SheetHeader = ({ className = '', ...props }) => (_jsx("div", { className: `flex items-center justify-between border-b border-border p-4 ${className}`, ...props }));
SheetHeader.displayName = 'SheetHeader';
const SheetTitle = React.forwardRef(({ className = '', ...props }, ref) => (_jsx("h2", { ref: ref, className: `text-lg font-semibold ${className}`, ...props })));
SheetTitle.displayName = 'SheetTitle';
export { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle };
//# sourceMappingURL=sheet.js.map