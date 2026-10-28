// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest';
import { vi } from 'vitest';
import { useEffect, useState } from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

// Imita o Quill: quando o `value` muda, ele reescreve o HTML no formato dele (aqui, troca <div>
// por <p>) e devolve pelo onChange — é o que apagava o HTML colado no modo código.
vi.mock('next/dynamic', () => ({
  default: () =>
    function FakeQuill({ value, onChange }: { value: string; onChange: (v: string) => void }) {
      useEffect(() => {
        const normalized = value.replace(/<(\/?)div>/g, '<$1p>');
        if (normalized !== value) onChange(normalized);
      }, [value, onChange]);
      return <div data-testid="quill" />;
    },
}));

import { QuillEditor } from './quill-editor';

afterEach(cleanup);

function Harness({ initial = '<p>oi</p>' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <QuillEditor value={value} onChange={setValue} source />
      <output data-testid="saved">{value}</output>
    </>
  );
}

describe('<QuillEditor> modo código', () => {
  it('mantém o HTML colado como está (o editor visual não o reescreve)', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /ver código/i }));
    const html = '<div class="box"><h2>Título</h2><div>texto</div></div>';
    fireEvent.change(screen.getByLabelText(/código html/i), { target: { value: html } });
    expect((screen.getByLabelText(/código html/i) as HTMLTextAreaElement).value).toBe(html);
    expect(screen.getByTestId('saved').textContent).toBe(html);
  });
});
