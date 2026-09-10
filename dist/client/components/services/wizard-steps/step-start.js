'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { StepHeader } from './step-header';
/** Exemplos curtos de título, como referência de formato. Clicar preenche o campo. */
const TITLE_EXAMPLES = [
    'Eletricista residencial — atendo emergência 24h',
    'Diarista com experiência e produtos inclusos',
    'Fotógrafo de eventos: casamento, aniversário e corporativo',
];
/**
 * Passo 1 do wizard — "Início". Só o nome/título do serviço. O antigo atalho da Naví virou
 * responsabilidade do engine: quando `assist` está disponível, o `Wizard` renderiza o próprio
 * botão "Preencher com IA" no header — este passo só mostra o campo de texto e os exemplos.
 */
export function StepStart({ state, patch }) {
    const title = state.title ?? '';
    const handleChange = (value) => patch({ title: value.slice(0, 120) });
    return (_jsxs("div", { className: "space-y-6", children: [_jsx(StepHeader, { title: "Digite o t\u00EDtulo do seu an\u00FAncio", subtitle: "Curto e direto: o servi\u00E7o que voc\u00EA faz e, se ajudar, um diferencial." }), _jsxs("div", { className: "space-y-3", children: [_jsx("input", { type: "text", value: title, onChange: (event) => handleChange(event.target.value), placeholder: "Ex.: Eletricista residencial, atendo emerg\u00EAncia 24h", className: "h-11 w-full rounded-lg border bg-background px-3.5 text-base leading-relaxed outline-none placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring" }), title.trim().length > 0 && title.trim().length < 5 ? (_jsx("p", { className: "text-xs text-muted-foreground", children: "Escreva um pouco mais (m\u00EDnimo 5 caracteres)." })) : null] }), _jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-xs font-medium text-muted-foreground", children: "Exemplos" }), _jsx("div", { className: "flex flex-col gap-1.5", children: TITLE_EXAMPLES.map((example) => (_jsx("button", { type: "button", onClick: () => handleChange(example), "data-active": title.trim() === example.trim(), className: "wz-selectable rounded-lg border bg-background px-3 py-2 text-left text-sm", children: example }, example))) })] })] }));
}
//# sourceMappingURL=step-start.js.map