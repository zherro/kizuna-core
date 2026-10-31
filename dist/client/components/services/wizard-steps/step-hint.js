import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertTriangle, Info, Lightbulb } from 'lucide-react';
import { cn } from '../../../../lib/utils';
const TONE = {
    tip: { icon: Lightbulb, className: 'bg-accent/20 text-foreground' },
    info: { icon: Info, className: 'bg-info/10 text-foreground' },
    warning: { icon: AlertTriangle, className: 'bg-warning/20 text-foreground' },
};
/**
 * Small inline note that helps the provider decide — a tip, a neutral clarification, or a
 * consequence warning. Keep the copy to one or two sentences.
 */
export function StepHint({ tone = 'tip', children }) {
    const { icon: Icon, className } = TONE[tone];
    return (_jsxs("div", { className: cn('flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-sm', className), children: [_jsx(Icon, { className: "mt-0.5 h-4 w-4 shrink-0 opacity-70", "aria-hidden": true }), _jsx("div", { className: "leading-relaxed [&_strong]:font-semibold", children: children })] }));
}
//# sourceMappingURL=step-hint.js.map