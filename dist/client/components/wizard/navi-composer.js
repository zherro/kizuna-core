'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Check, Send } from 'lucide-react';
/**
 * Tags/opções + campo livre + validação. Compartilhado pelo `NaviDock` (inline) e pelo
 * `NaviPanel` (lateral/tela cheia) — a conversa é a mesma nos dois.
 */
export function NaviComposer({ conv }) {
    const [input, setInput] = useState('');
    const [selected, setSelected] = useState([]);
    const [error, setError] = useState('');
    const hasChoices = conv.choices.length > 0;
    const toggleMulti = (label) => {
        setError('');
        setSelected((s) => (s.includes(label) ? s.filter((x) => x !== label) : [...s, label]));
    };
    const pick = (c) => {
        setError('');
        conv.pickChoice(c);
    };
    const sendSelected = () => {
        if (selected.length === 0)
            return;
        const joined = selected.join(', ');
        setSelected([]);
        setError('');
        void conv.send(joined);
    };
    const submitInput = () => {
        const t = input.trim();
        if (!t) {
            if (selected.length > 0)
                return sendSelected();
            setError(hasChoices ? 'Escreva uma mensagem ou toque numa opção.' : 'Escreva uma mensagem.');
            return;
        }
        setError('');
        setInput('');
        void conv.send(t);
    };
    return (_jsxs("div", { className: "space-y-3", children: [hasChoices ? (_jsxs("div", { className: "space-y-1.5", children: [_jsx("p", { className: "text-[11px] font-medium text-muted-foreground", children: "Sugest\u00F5es da Nav\u00ED" }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [conv.choices.map((c) => {
                                const isMulti = Boolean(c.multi);
                                const on = selected.includes(c.label);
                                return (_jsxs("button", { type: "button", onClick: () => (isMulti ? toggleMulti(c.label) : pick(c)), "data-on": on || undefined, "data-advance": c.advance || undefined, className: "wz-navi-chip", children: [isMulti ? (_jsx("span", { className: "wz-navi-checkbox", children: on ? _jsx(Check, { className: "h-3 w-3" }) : null })) : null, c.label] }, c.label));
                            }), selected.length > 0 ? (_jsxs("button", { type: "button", onClick: sendSelected, className: "wz-navi-send", children: ["Enviar ", selected.length] })) : null] })] })) : null, _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { value: input, onChange: (e) => {
                            setInput(e.target.value);
                            if (error)
                                setError('');
                        }, onKeyDown: (e) => e.key === 'Enter' && submitInput(), placeholder: hasChoices ? 'ou escreva aqui…' : 'escreva aqui…', disabled: conv.pending, "aria-invalid": Boolean(error) || undefined, className: "h-10 flex-1 rounded-full bg-muted px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" }), _jsx("button", { type: "button", onClick: submitInput, disabled: conv.pending, "aria-label": "Enviar mensagem", className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50", children: _jsx(Send, { className: "h-4 w-4" }) })] }), error ? (_jsx("p", { role: "alert", className: "wz-navi-error text-xs font-medium", children: error })) : null] }));
}
//# sourceMappingURL=navi-composer.js.map