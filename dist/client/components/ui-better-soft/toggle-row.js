'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { useId } from 'react';
export function ToggleRow({ title, subtitle, checked, onChange, disabled, }) {
    const id = useId();
    return (_jsxs("div", { className: "flex items-start justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3", children: [_jsxs("div", { className: "min-w-0 space-y-0.5", children: [_jsx(Label, { htmlFor: id, className: "text-sm font-medium cursor-pointer", children: title }), subtitle && _jsx("p", { className: "text-xs text-muted-foreground", children: subtitle })] }), _jsx(Switch, { id: id, checked: checked, onCheckedChange: onChange, disabled: disabled })] }));
}
//# sourceMappingURL=toggle-row.js.map