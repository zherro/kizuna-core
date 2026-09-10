'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Clock } from 'lucide-react';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import { cn } from '../../../lib/utils';
export function ScheduleRow({ label, icon: Icon, description, enabled, onEnabledChange, start, end, onStartChange, onEndChange, switchAriaLabel, }) {
    return (_jsx("div", { className: cn('rounded-xl border border-border bg-card p-3 transition-colors', !enabled && 'opacity-70'), children: _jsxs("div", { className: "flex flex-wrap items-center gap-3 sm:flex-nowrap", children: [_jsxs("div", { className: "flex min-w-[160px] items-center gap-3", children: [_jsx(Switch, { checked: enabled, onCheckedChange: onEnabledChange, "aria-label": switchAriaLabel ?? label }), _jsxs("span", { className: "flex items-center gap-1.5 text-sm font-medium", children: [Icon ? _jsx(Icon, { className: "h-4 w-4 text-muted-foreground" }) : null, label] })] }), description ? (_jsx("p", { className: "mr-4 flex-1 text-xs text-muted-foreground", children: description })) : null, _jsxs("div", { className: "flex flex-1 items-center gap-2", children: [_jsx(Clock, { className: "h-4 w-4 shrink-0 text-muted-foreground" }), _jsx(Input, { type: "time", value: start, disabled: !enabled, onChange: (event) => onStartChange(event.target.value), className: "w-[110px]" }), _jsx("span", { className: "text-sm text-muted-foreground", children: "at\u00E9" }), _jsx(Input, { type: "time", value: end, disabled: !enabled, onChange: (event) => onEndChange(event.target.value), className: "w-[110px]" })] })] }) }));
}
//# sourceMappingURL=schedule-row.js.map