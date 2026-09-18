import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { activeTheme } from '../../lib/ui-theme';
import { cn } from '../../../lib/utils';
const VARIANT_TOKEN = {
    default: 'card',
    compact: 'cardCompact',
    flat: 'cardFlat',
};
/**
 * Card do kit `ui-better-soft` — com ou sem cabeçalho (ícone + título + descrição). O visual
 * (raio, borda, sombra) vem de `activeTheme`, resolvido uma vez por deployment via
 * `NEXT_PUBLIC_UI_STYLE`; este é o único componente de card do kit, não existe uma variante
 * paralela "soft".
 */
export function Section({ icon, title, description, variant = 'default', accentColor, className, children, }) {
    return (_jsxs("section", { className: cn(activeTheme[VARIANT_TOKEN[variant]], 
        // No soft, a base não tem borda — só ganha uma (tingida via `accentColor`) quando há
        // destaque pontual. No classic, o token já inclui `border`; repetir aqui é inofensivo.
        accentColor ? 'border' : undefined, className), style: accentColor
            ? { borderColor: `color-mix(in oklch, ${accentColor} 30%, transparent)` }
            : undefined, children: [title ? (_jsxs("header", { className: "mb-4 flex items-start gap-3", children: [icon ? (_jsx("span", { className: "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand", children: icon })) : null, _jsxs("div", { children: [_jsx("h2", { className: "text-base font-bold sm:text-lg", children: title }), description ? (_jsx("p", { className: "mt-0.5 text-sm text-muted-foreground", children: description })) : null] })] })) : null, children] }));
}
//# sourceMappingURL=section.js.map