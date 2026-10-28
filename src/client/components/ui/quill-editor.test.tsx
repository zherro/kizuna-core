// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest';
import { vi } from 'vitest';
import { useEffect, useRef, useState } from 'react';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

// Imita o react-quill-new + Quill 2: a cada render compara o `value` recebido com o último HTML que
// conhece (como o shouldComponentUpdate dele); se forem diferentes, regrava o conteúdo e, se o HTML
// dele (getSemanticHTML: <div> vira <p>, espaço vira &nbsp;) sair diferente, devolve pelo onChange.
vi.mock('next/dynamic', () => ({
  default: () =>
    function FakeQuill({ value, onChange }: { value: string; onChange: (v: string) => void }) {
      const known = useRef<string | null>(null);
      const rewrites = useRef(0);
      useEffect(() => {
        if (value === known.current) return;
        if (++rewrites.current > 20) throw new Error('loop: o Quill recebeu de volta um HTML que não é dele');
        known.current = value;
        const semantic = value.replace(/<(\/?)div>/g, '<$1p>').replace(/ /g, '&nbsp;');
        if (semantic !== value) {
          known.current = semantic;
          onChange(semantic);
        }
      });
      return <div data-testid="quill" />;
    },
}));

import { QuillEditor } from './quill-editor';

afterEach(cleanup);

function Harness({ initial = '<p>oi</p>' }: { initial?: string }) {
  // Como o wizard: todo onChange gera estado novo (re-render), mesmo com o mesmo texto.
  const [state, setState] = useState({ value: initial });
  return (
    <>
      <QuillEditor value={state.value} onChange={(value) => setState({ value })} source />
      <output data-testid="saved">{state.value}</output>
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

describe('<QuillEditor> editor visual', () => {
  it('não grava &nbsp; no lugar dos espaços (getSemanticHTML do Quill 2)', () => {
    render(<Harness initial="<div>A Noite é um Jogo</div>" />);
    expect(screen.getByTestId('saved').textContent).toBe('<p>A Noite é um Jogo</p>');
  });
});
