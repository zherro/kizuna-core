import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Section({ icon, title, description, children }) {
    return (_jsxs("section", { className: "rounded-2xl border border-border bg-background p-5 shadow-sm sm:p-6", children: [_jsxs("header", { className: "mb-4 flex items-start gap-3", children: [_jsx("span", { className: "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand", children: icon }), _jsxs("div", { children: [_jsx("h2", { className: "text-base font-bold sm:text-lg", children: title }), description ? (_jsx("p", { className: "mt-0.5 text-sm text-muted-foreground", children: description })) : null] })] }), children] }));
}
//# sourceMappingURL=section.js.map