import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '../../../lib/utils';
export function Textarea({ className, ...props }) {
    return (_jsx("textarea", { className: cn('min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50', className), ...props }));
}
//# sourceMappingURL=textarea.js.map