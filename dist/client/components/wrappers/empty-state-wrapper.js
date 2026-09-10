import { jsx as _jsx } from "react/jsx-runtime";
export function EmptyStateWrapper({ show, children, className }) {
    if (!show)
        return null;
    return (_jsx("div", { className: className ?? 'rounded-lg border border-dashed p-4 text-sm text-muted-foreground', children: children }));
}
//# sourceMappingURL=empty-state-wrapper.js.map