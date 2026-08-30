'use client';

import dynamic from 'next/dynamic';
import { CSSProperties } from 'react';

const MDEditor = dynamic(() => import('@uiw/react-markdown-editor').then((mod) => mod.default), {
  ssr: false,
});

export type MarkdownEditorProps = {
  value: string;
  onChange: (value: string) => void;
  height?: number | any;
};

export function MarkdownEditor({ value, onChange, height = 300 }: MarkdownEditorProps) {
  const containerStyle: CSSProperties = {
    borderRadius: '0.375rem',
    border: '1px solid hsl(var(--input))',
    overflow: 'hidden',
  };

  return (
    <div style={containerStyle} className="bg-background">
      <MDEditor value={value} onChange={(val) => onChange(val ?? '')} height={height} />
    </div>
  );
}
