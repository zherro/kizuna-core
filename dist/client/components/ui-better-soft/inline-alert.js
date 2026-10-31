import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
/** Small inline banner for form-level feedback (e.g. a load or submit error above a step). */
export function InlineAlert({ type, text }) {
    const isError = type === 'error';
    const tone = isError
        ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300'
        : 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300';
    return (_jsxs("div", { className: `flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${tone}`, children: [isError ? (_jsx(AlertTriangle, { className: "mt-0.5 h-4 w-4 shrink-0", "aria-hidden": "true" })) : (_jsx(CheckCircle2, { className: "mt-0.5 h-4 w-4 shrink-0", "aria-hidden": "true" })), _jsx("p", { children: text })] }));
}
//# sourceMappingURL=inline-alert.js.map