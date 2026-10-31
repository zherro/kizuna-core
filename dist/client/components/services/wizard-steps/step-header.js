import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { PorQueIsso } from './por-que-isso';
/**
 * The header every wizard step opens with: an optional small kicker, a large plain-language
 * question, one supporting line, and an optional "por que pedimos isso?" disclosure. Position in
 * the flow is shown by the rail / mobile progress bar, not a number here.
 */
export function StepHeader({ kicker, title, subtitle, why, }) {
    return (_jsxs("header", { className: "space-y-2.5", children: [kicker ? _jsx("p", { className: "text-xs font-medium text-muted-foreground", children: kicker }) : null, _jsx("h1", { className: "font-display text-2xl font-medium tracking-tight text-foreground sm:text-[1.75rem] sm:leading-[1.15]", children: title }), subtitle ? (_jsx("p", { className: "max-w-prose text-[15px] leading-relaxed text-muted-foreground", children: subtitle })) : null, why ? _jsx(PorQueIsso, { children: why }) : null] }));
}
//# sourceMappingURL=step-header.js.map