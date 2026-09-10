'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button } from '../ui/button';
import { Code, List } from 'lucide-react';
import { NON_VALUE_TYPES, fieldKey } from './types';
import { collectOutput, isFieldVisible } from './validate';
function formatValue(v) {
    if (v == null || v === '')
        return '—';
    if (Array.isArray(v))
        return v.length ? v.join(', ') : '—';
    if (typeof v === 'boolean')
        return v ? 'Sim' : 'Não';
    return String(v);
}
export function FormResultViewer({ schema, values }) {
    const [mode, setMode] = useState('list');
    const output = collectOutput(schema, values);
    return (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-sm font-semibold", children: "Respostas" }), _jsxs("div", { className: "flex gap-1", children: [_jsxs(Button, { size: "sm", variant: mode === 'list' ? 'default' : 'outline', onClick: () => setMode('list'), children: [_jsx(List, { className: "mr-1 h-3.5 w-3.5" }), " Lista"] }), _jsxs(Button, { size: "sm", variant: mode === 'json' ? 'default' : 'outline', onClick: () => setMode('json'), children: [_jsx(Code, { className: "mr-1 h-3.5 w-3.5" }), " JSON"] })] })] }), mode === 'list' ? (_jsx("div", { className: "divide-y rounded-md border", children: schema.fields
                    .filter((f) => !NON_VALUE_TYPES.has(f.type) && f.type !== 'hidden')
                    .map((f) => {
                    const key = fieldKey(f);
                    const visible = isFieldVisible(f, values);
                    return (_jsxs("div", { className: "grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 px-3 py-2 text-sm", children: [_jsx("span", { className: "truncate font-medium text-muted-foreground", children: f.label || key }), _jsx("span", { className: "truncate", children: visible ? (formatValue(values[key])) : (_jsx("em", { className: "text-muted-foreground", children: "oculto" })) })] }, f.id));
                }) })) : (_jsx("pre", { className: "max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs", children: JSON.stringify(output, null, 2) }))] }));
}
//# sourceMappingURL=FormResultViewer.js.map