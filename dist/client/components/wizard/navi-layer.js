'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NaviDock } from './navi-dock';
import { NaviIcon } from './navi-icon';
/**
 * A camada persistente da Naví no wizard: fica ao pé da coluna de passos e **acompanha o scroll**
 * (o shell renderiza isto uma vez, no fim do `<main>`). Dock aberto, pílula quando minimizado,
 * ou um aviso curto se a Naví caiu no meio.
 */
export function NaviLayer({ conv }) {
    if (conv.endedMidway) {
        return (_jsx("p", { className: "wz-navi-dock mx-auto mt-6 w-full max-w-2xl rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground", children: "A Nav\u00ED saiu do ar. Pode continuar preenchendo na m\u00E3o \u2014 o que ela j\u00E1 respondeu est\u00E1 salvo." }));
    }
    if (conv.minimized) {
        return (_jsxs("button", { type: "button", onClick: () => conv.setMinimized(false), className: "wz-navi-fab", "aria-label": "Abrir a Nav\u00ED", "data-testid": "navi-fab", "data-busy": conv.pending || undefined, children: [_jsx(NaviIcon, { className: "h-4 w-4" }), " Nav\u00ED", conv.pending ? _jsx("span", { className: "wz-navi-fab-dot", "aria-hidden": true }) : null] }));
    }
    return (_jsx("div", { className: "mt-6", children: _jsx(NaviDock, { conv: conv }) }));
}
//# sourceMappingURL=navi-layer.js.map