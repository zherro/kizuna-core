'use client';

import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

export type QuillEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

const TOOLBAR = [
  ['bold', 'italic', 'underline'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['clean'],
];

export function QuillEditor({ value, onChange, placeholder }: QuillEditorProps) {
  return (
    <div className="quill-wrapper rounded-md border border-input bg-background">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={{ toolbar: TOOLBAR }}
        placeholder={placeholder ?? 'Escreva a descrição do anúncio...'}
      />
    </div>
  );
}
