'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '../../../lib/utils';
export function ChannelChip({ label, checked, onChange }) {
    return (_jsx("button", { type: "button", onClick: () => onChange(!checked), className: cn('rounded-full border px-3 py-1.5 text-xs font-medium transition-colors', checked
            ? 'border-brand bg-primary text-card'
            : 'border-border bg-card text-muted-foreground hover:text-foreground'), children: label }));
}
//# sourceMappingURL=channel-chip.js.map