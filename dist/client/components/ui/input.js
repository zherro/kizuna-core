'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '../../../lib/utils';
export function Input({ className, ...props }) {
    return (_jsx("input", { className: cn('flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50', className), ...props }));
}
//# sourceMappingURL=input.js.map