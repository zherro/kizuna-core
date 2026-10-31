'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });
const TOOLBAR = [
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['clean'],
];
export function QuillEditor({ value, onChange, placeholder }) {
    return (_jsx("div", { className: "quill-wrapper rounded-md border border-input bg-background", children: _jsx(ReactQuill, { theme: "snow", value: value, onChange: onChange, modules: { toolbar: TOOLBAR }, placeholder: placeholder ?? 'Escreva a descrição do anúncio...' }) }));
}
//# sourceMappingURL=quill-editor.js.map