'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { StepHeader } from './step-header';
/**
 * Passo 1 do wizard — "Início". Só o nome/título do serviço. O antigo atalho da Naví virou
 * responsabilidade do engine: quando `assist` está disponível, o `Wizard` renderiza o próprio
 * botão "Preencher com IA" no header. Os exemplos estáticos saíram daqui — a Naví conversacional
 * já sugere títulos personalizados no lugar (ver `use-navi-conversation.ts`).
 */
export function StepStart({ state, patch }) {
    const title = state.title ?? '';
    const handleChange = (value) => patch({ title: value.slice(0, 120) });
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(StepHeader, { title: "Digite o t\u00EDtulo do seu an\u00FAncio", subtitle: "Curto e direto: o servi\u00E7o que voc\u00EA faz e, se ajudar, um diferencial." }), _jsxs("div", { className: "space-y-3", children: [_jsx("input", { type: "text", value: title, onChange: (event) => handleChange(event.target.value), placeholder: "Ex.: Eletricista residencial, atendo emerg\u00EAncia 24h", className: "h-11 w-full rounded-lg border bg-background px-3.5 text-base leading-relaxed outline-none placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring" }), title.trim().length > 0 && title.trim().length < 5 ? (_jsx("p", { className: "text-xs text-muted-foreground", children: "Escreva um pouco mais (m\u00EDnimo 5 caracteres)." })) : null] })] }));
}
//# sourceMappingURL=step-start.js.map