'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import * as React from 'react';
const Checkbox = React.forwardRef(({ className = '', onCheckedChange, ...props }, ref) => {
    const handleChange = (e) => {
        onCheckedChange?.(e.target.checked);
        props.onChange?.(e);
    };
    return (_jsx("input", { type: "checkbox", ref: ref, onChange: handleChange, className: `h-4 w-4 rounded border-border bg-background text-primary focus:ring-2 focus:ring-primary/40 ${className}`, ...props }));
});
Checkbox.displayName = 'Checkbox';
export { Checkbox };
//# sourceMappingURL=checkbox.js.map