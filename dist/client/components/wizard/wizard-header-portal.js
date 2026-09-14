'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
/**
 * Projeta a "chrome" do wizard (rótulo do modo, toggle de layout, ações de IA, Cancelar) no
 * cabeçalho ÚNICO do `PanelShellBase` (o `<div id="wz-header-slot">` do ramo full-bleed), pra não
 * existir um segundo cabeçalho. Sem o slot no DOM (SSR, outro host), renderiza inline como fallback.
 */
export function WizardHeaderPortal({ children }) {
    const [el, setEl] = useState(null);
    useEffect(() => {
        setEl(document.getElementById('wz-header-slot'));
    }, []);
    if (!el) {
        return (_jsx("div", { className: "flex items-center justify-end gap-2 border-b border-border px-4 py-2 sm:px-6", children: children }));
    }
    return createPortal(children, el);
}
//# sourceMappingURL=wizard-header-portal.js.map