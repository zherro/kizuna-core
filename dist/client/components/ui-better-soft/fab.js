import { jsx as _jsx } from "react/jsx-runtime";
import { Button } from '../ui/button';
import { activeTheme } from '../../lib/ui-theme';
import { cn } from '../../../lib/utils';
/**
 * Botão circular único, fixo no rodapé — a ação primária de uma tela mobile. Sem pílula, sem
 * slot de ação secundária. Tamanho/sombra vêm de `activeTheme.fab`, resolvido por
 * `NEXT_PUBLIC_UI_STYLE`.
 */
export function Fab({ icon: Icon, onClick, ariaLabel, className }) {
    return (_jsx("div", { className: "fixed inset-x-0 bottom-0 z-10 flex justify-center pb-4", children: _jsx(Button, { type: "button", size: "icon", onClick: onClick, "aria-label": ariaLabel, className: cn(activeTheme.fab, className), children: _jsx(Icon, { className: "h-6 w-6" }) }) }));
}
//# sourceMappingURL=fab.js.map