'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { X } from 'lucide-react';
import { NaviIcon } from './navi-icon';
import { NaviComposer } from './navi-composer';
/**
 * Fio completo da Naví. Desktop (`md+`): painel ancorado à direita. Mobile: tela cheia.
 * Mesmo estado do `NaviDock` (`conv`) + o mesmo `NaviComposer`. Saudação só quando o fio ainda
 * não começou (`conv.fresh`).
 */
export function NaviPanel({ conv }) {
    if (!conv.panelOpen)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-50 flex justify-end bg-foreground/30 md:bg-transparent", onMouseDown: (e) => e.target === e.currentTarget && conv.setPanelOpen(false), children: _jsxs("aside", { role: "dialog", "aria-label": "Conversa com a Nav\u00ED", className: "flex h-full w-full flex-col bg-background shadow-xl md:w-[420px] md:border-l md:border-border", children: [_jsxs("header", { className: "flex shrink-0 items-center gap-2 border-b border-border px-4 py-3", children: [_jsx("span", { className: "wz-navi-badge", children: _jsx(NaviIcon, { className: "h-4 w-4" }) }), _jsx("span", { className: "flex-1 text-sm font-semibold", children: "Nav\u00ED" }), _jsx("button", { type: "button", onClick: () => conv.setPanelOpen(false), "aria-label": "Fechar", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsxs("div", { className: "min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3 text-sm", children: [conv.fresh ? (_jsx("div", { className: "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2", children: conv.greeting })) : null, conv.turns.map((t, i) => (_jsx("div", { className: t.role === 'user'
                                ? 'ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-primary-foreground'
                                : 'mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2', children: t.content }, i))), conv.pending ? (_jsx("div", { className: "mr-auto rounded-2xl bg-muted px-3 py-2 text-muted-foreground", children: "pensando\u2026" })) : null] }), _jsx("div", { className: "shrink-0 border-t border-border p-3", children: _jsx(NaviComposer, { conv: conv }) })] }) }));
}
//# sourceMappingURL=navi-panel.js.map