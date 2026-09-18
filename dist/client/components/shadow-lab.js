'use client';
import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from './ui/button';
function SliderField({ label, value, min, max, step = 1, unit, onChange, }) {
    return (_jsxs("label", { className: "block", children: [_jsxs("span", { className: "flex items-center justify-between text-sm font-medium", children: [label, _jsxs("span", { className: "text-muted-foreground", children: [value, unit] })] }), _jsx("input", { type: "range", min: min, max: max, step: step, value: value, onChange: (event) => onChange(Number(event.target.value)), className: "mt-1.5 w-full accent-primary" })] }));
}
/**
 * Ferramenta de dev: monta um `box-shadow` ajustando deslocamento/desfoque/espalhamento/opacidade
 * na hora, com preview lado a lado num par de superfícies quase idênticas (branco sobre branco) e
 * num par de cor do tema sobre o fundo do tema — os dois casos onde uma sombra mal calibrada
 * "some" porque as cores são próximas demais. Sem lógica de negócio, genérico.
 */
export function ShadowLab({ className }) {
    const [x, setX] = useState(0);
    const [y, setY] = useState(-4);
    const [blur, setBlur] = useState(10);
    const [spread, setSpread] = useState(-2);
    const [opacity, setOpacity] = useState(0.18);
    const [inset, setInset] = useState(false);
    const [copied, setCopied] = useState(false);
    const shadowValue = `${inset ? 'inset ' : ''}${x}px ${y}px ${blur}px ${spread}px rgba(0,0,0,${opacity})`;
    const tailwindClass = `shadow-[${shadowValue.replace(/ /g, '_')}]`;
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(tailwindClass);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        }
        catch {
            setCopied(false);
        }
    };
    return (_jsxs("div", { className: className, children: [_jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [_jsx(SliderField, { label: "Deslocamento X", value: x, min: -40, max: 40, unit: "px", onChange: setX }), _jsx(SliderField, { label: "Deslocamento Y", value: y, min: -40, max: 40, unit: "px", onChange: setY }), _jsx(SliderField, { label: "Desfoque (blur)", value: blur, min: 0, max: 80, unit: "px", onChange: setBlur }), _jsx(SliderField, { label: "Espalhamento (spread)", value: spread, min: -40, max: 40, unit: "px", onChange: setSpread }), _jsx(SliderField, { label: "Opacidade", value: opacity, min: 0, max: 0.5, step: 0.01, onChange: setOpacity }), _jsxs("label", { className: "flex items-center gap-2 pt-6 text-sm font-medium", children: [_jsx("input", { type: "checkbox", checked: inset, onChange: (event) => setInset(event.target.checked), className: "accent-primary" }), "Sombra interna (inset)"] })] }), _jsxs("div", { className: "mt-6 grid gap-4 sm:grid-cols-2", children: [_jsxs("div", { className: "rounded-2xl bg-background p-8", children: [_jsx("p", { className: "mb-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase", children: "Branco sobre branco" }), _jsx("div", { className: "h-24 rounded-2xl bg-card", style: { boxShadow: shadowValue } })] }), _jsxs("div", { className: "rounded-2xl bg-background p-8", children: [_jsx("p", { className: "mb-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase", children: "Cor do tema sobre o fundo do tema" }), _jsx("div", { className: "h-24 rounded-2xl", style: { boxShadow: shadowValue, backgroundColor: 'var(--color-primary)' } })] })] }), _jsxs("div", { className: "mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background p-3", children: [_jsx("code", { className: "text-xs break-all", children: tailwindClass }), _jsxs(Button, { type: "button", size: "sm", variant: "outline", onClick: () => void copy(), children: [copied ? _jsx(Check, { className: "h-3.5 w-3.5" }) : _jsx(Copy, { className: "h-3.5 w-3.5" }), copied ? 'Copiado' : 'Copiar'] })] })] }));
}
//# sourceMappingURL=shadow-lab.js.map