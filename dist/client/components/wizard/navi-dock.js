'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChevronDown, Maximize2, RefreshCw } from 'lucide-react';
import { NaviIcon } from './navi-icon';
import { NaviComposer } from './navi-composer';
/**
 * Dock da Naví: última fala em destaque + a penúltima desfocada + `NaviComposer`. Fica ao pé da
 * coluna de passos e acompanha o scroll (`.wz-navi-dock` = `sticky bottom`). Minimizar recolhe
 * pra pílula (ver `NaviLayer`); "Ver conversa" abre o `NaviPanel`. Renderer puro — o estado vem
 * de `conv` (`useWizardConversation`).
 */
export function NaviDock({ conv }) {
    const last = conv.turns[conv.turns.length - 1];
    const penult = conv.turns.length >= 2 ? conv.turns[conv.turns.length - 2] : null;
    return (_jsxs("div", { className: "wz-navi-dock mx-auto w-full max-w-2xl", "data-testid": "navi-dock", children: [penult ? (_jsx("p", { className: "px-4 pb-1 text-xs text-muted-foreground blur-[1.6px] select-none", children: penult.content })) : null, _jsxs("div", { className: "wz-navi-card p-3.5", children: [_jsxs("div", { className: "flex gap-2.5", children: [_jsx("span", { className: "wz-navi-badge", children: _jsx(NaviIcon, { className: "h-4 w-4" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "text-[15px] font-medium leading-relaxed text-foreground", children: conv.pending ? 'pensando…' : (last?.content ?? conv.greeting) }), conv.status === 'degraded' ? (_jsxs("button", { type: "button", onClick: () => conv.retry?.(), className: "mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground", children: [_jsx(RefreshCw, { className: "h-3.5 w-3.5" }), " Tentar de novo"] })) : (_jsx("div", { className: "mt-3", children: _jsx(NaviComposer, { conv: conv }) }))] })] }), _jsxs("div", { className: "mt-3 flex gap-4 text-[11px] text-muted-foreground", children: [_jsxs("button", { type: "button", onClick: () => conv.setMinimized(true), className: "inline-flex items-center gap-1 hover:text-foreground", children: [_jsx(ChevronDown, { className: "h-3 w-3" }), " minimizar"] }), _jsxs("button", { type: "button", onClick: () => conv.setPanelOpen(true), className: "inline-flex items-center gap-1 hover:text-foreground", children: [_jsx(Maximize2, { className: "h-3 w-3" }), " Ver conversa"] })] })] })] }));
}
//# sourceMappingURL=navi-dock.js.map