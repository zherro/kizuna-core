'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import dynamic from 'next/dynamic';
const MDEditor = dynamic(() => import('@uiw/react-markdown-editor').then((mod) => mod.default), {
    ssr: false,
});
export function MarkdownEditor({ value, onChange, height = 300 }) {
    const containerStyle = {
        borderRadius: '0.375rem',
        border: '1px solid hsl(var(--input))',
        overflow: 'hidden',
    };
    return (_jsx("div", { style: containerStyle, className: "bg-background", children: _jsx(MDEditor, { value: value, onChange: (val) => onChange(val ?? ''), height: height }) }));
}
//# sourceMappingURL=markdown-editor.js.map