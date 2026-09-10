'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { SendHorizonal } from 'lucide-react';
import { Button } from '../ui/button';
export function MessageInput({ disabled, onSend, }) {
    const [text, setText] = useState('');
    const submit = () => {
        const t = text.trim();
        if (!t)
            return;
        onSend(t);
        setText('');
    };
    return (_jsxs("form", { className: "flex items-end gap-2 border-t border-border bg-background p-3", onSubmit: (e) => {
            e.preventDefault();
            submit();
        }, children: [_jsx("textarea", { value: text, onChange: (e) => setText(e.target.value), onKeyDown: (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        submit();
                    }
                }, rows: 1, placeholder: "Digite sua mensagem\u2026", "aria-label": "Mensagem", className: "max-h-32 min-h-9 flex-1 resize-none rounded-2xl border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" }), _jsx(Button, { type: "submit", size: "icon", disabled: disabled || !text.trim(), "aria-label": "Enviar mensagem", children: _jsx(SendHorizonal, { className: "h-4 w-4" }) })] }));
}
//# sourceMappingURL=message-input.js.map