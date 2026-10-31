import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Bot } from 'lucide-react';
/** Ícone da Naví com ondas (ripple) — chama atenção sem distrair. Espelha AssistantIcon da busca. */
export function NaviIcon({ className = 'h-4 w-4' }) {
    return (_jsxs("span", { className: `relative inline-flex ${className} shrink-0 items-center justify-center`, children: [_jsx("span", { className: "absolute inset-0 animate-ping rounded-full bg-current opacity-40" }), _jsx("span", { className: "absolute inset-0 animate-ping rounded-full bg-current opacity-30 [animation-delay:0.5s]" }), _jsx(Bot, { className: `relative ${className}` })] }));
}
//# sourceMappingURL=navi-icon.js.map