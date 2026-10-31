import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function EmptyStateCard({ icon: Icon, title, description, action, }) {
    return (_jsxs("div", { className: "rounded-2xl border border-dashed border-border bg-card p-8 text-center", children: [_jsx("div", { className: "mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted", children: _jsx(Icon, { className: "h-6 w-6 text-muted-foreground" }) }), _jsx("h3", { className: "mt-3 text-base font-semibold", children: title }), _jsx("p", { className: "mx-auto mt-1 max-w-sm text-sm text-muted-foreground", children: description }), action ? _jsx("div", { className: "mt-4 flex justify-center", children: action }) : null] }));
}
//# sourceMappingURL=empty-state-card.js.map