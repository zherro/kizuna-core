import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Typography } from '../../ui/typography';
/** Small header for a single step of a wizard: title + optional subtitle. */
export function StepIntro({ title, subtitle }) {
    return (_jsxs("header", { className: "space-y-1", children: [_jsx(Typography.H2, { weight: "medium", children: title }), subtitle ? _jsx("p", { className: "text-sm text-muted-foreground", children: subtitle }) : null] }));
}
//# sourceMappingURL=step-intro.js.map