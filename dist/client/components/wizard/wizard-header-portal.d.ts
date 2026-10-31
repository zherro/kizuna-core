import { type ReactNode } from 'react';
/**
 * Projeta a "chrome" do wizard (rótulo do modo, toggle de layout, ações de IA, Cancelar) no
 * cabeçalho ÚNICO do `PanelShellBase` (o `<div id="wz-header-slot">` do ramo full-bleed), pra não
 * existir um segundo cabeçalho. Sem o slot no DOM (SSR, outro host), renderiza inline como fallback.
 */
export declare function WizardHeaderPortal({ children }: {
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=wizard-header-portal.d.ts.map