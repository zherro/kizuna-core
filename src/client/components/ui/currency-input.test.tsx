// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { CurrencyInput, formatBRL, parseBRL } from './currency-input';

afterEach(cleanup);

describe('máscara BR (entra pela direita)', () => {
  it('formatBRL e parseBRL', () => {
    expect(formatBRL(1234.5)).toBe('1.234,50');
    expect(formatBRL(0.05)).toBe('0,05');
    expect(parseBRL('1.234,50')).toBe(1234.5);
    expect(parseBRL('5')).toBe(0.05);
    expect(parseBRL('')).toBe(0);
    // ignora tudo que não é dígito e limita o tamanho
    expect(parseBRL('R$ 12a,3')).toBe(1.23);
    expect(parseBRL('9'.repeat(20))).toBe(9999999999.99);
  });

  function Harness({ onValue }: { onValue?: (v: number) => void }) {
    const [value, setValue] = useState(0);
    return (
      <CurrencyInput
        aria-label="valor"
        value={value}
        onValueChange={(v) => {
          setValue(v);
          onValue?.(v);
        }}
      />
    );
  }

  it('digitar empurra os dígitos e o backspace apaga do fim', () => {
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    const input = screen.getByLabelText('valor') as HTMLInputElement;

    // digita 1, 2, 3, 4, 5 (o navegador entrega o texto atual + o novo dígito)
    for (const next of ['1', '0,12', '1,23', '12,34', '123,45']) {
      fireEvent.change(input, { target: { value: next } });
    }
    expect(input.value).toBe('123,45');

    // backspace: o navegador remove o último caractere do texto mostrado ("123,4")
    fireEvent.change(input, { target: { value: '123,4' } });
    expect(input.value).toBe('12,34');
    fireEvent.change(input, { target: { value: '12,3' } });
    expect(input.value).toBe('1,23');
    expect(onValue).toHaveBeenLastCalledWith(1.23);
  });

  it('desabilitado não recebe digitação', () => {
    render(<CurrencyInput aria-label="v" value={0} onValueChange={() => {}} disabled />);
    expect((screen.getByLabelText('v') as HTMLInputElement).disabled).toBe(true);
  });
});
