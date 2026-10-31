'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { WizardStrip } from './wizard-rail';
export function WizardProgress({ stepLabel, currentStep, totalSteps, progress, steps, current, furthest, onJump, }) {
    return (_jsxs("div", { className: "mx-auto max-w-5xl px-4 pb-2.5 sm:px-6 md:hidden", children: [_jsxs("div", { className: "flex items-center justify-between text-xs text-muted-foreground", children: [_jsx("span", { className: "truncate font-medium text-foreground", children: stepLabel }), _jsxs("span", { className: "shrink-0", children: ["Passo ", currentStep, " de ", totalSteps] })] }), _jsx("div", { className: "mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted", children: _jsx("div", { className: "h-full bg-primary transition-all duration-500 ease-out", style: { width: `${progress}%` } }) }), _jsx("div", { className: "mt-2.5", children: _jsx(WizardStrip, { steps: steps, current: current, furthest: furthest, onJump: onJump }) })] }));
}
//# sourceMappingURL=wizard-progress.js.map