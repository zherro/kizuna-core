'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '../../../lib/utils';
import { Progress } from '../ui/progress';
function clampPercent(value) {
    if (!Number.isFinite(value))
        return 0;
    if (value < 0)
        return 0;
    if (value > 100)
        return 100;
    return Math.round(value);
}
export function FixedBottomProgress({ steps, value, className, fixed = true, }) {
    const total = Math.max(steps.length, 1);
    const currentIndex = Math.max(0, steps.findIndex((step) => step.id === value));
    const completedSteps = Math.max(currentIndex, 0);
    const percent = clampPercent(total <= 1 ? 0 : (completedSteps / (total - 1)) * 100);
    return (_jsx("div", { className: cn(fixed
            ? 'fixed inset-x-0 bottom-[61px] z-40 border-t border-border bg-background/96 backdrop-blur supports-[backdrop-filter]:bg-background/85'
            : 'rounded-xl border border-border bg-background', className), children: _jsx("div", { className: "mx-auto w-full", children: _jsx(Progress, { value: percent }) }) }));
}
//# sourceMappingURL=fixed-bottom-progress.js.map