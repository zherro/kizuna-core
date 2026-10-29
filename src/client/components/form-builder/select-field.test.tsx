// @vitest-environment jsdom
import { useState } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { FormRenderer } from './FormRenderer';
import type { FormField, FormValues } from './types';

afterEach(cleanup);

const classificacao: FormField = {
  id: 'evt_10_classificacao_indicativa',
  key: 'classificacao_indicativa',
  name: 'classificacao_indicativa',
  type: 'select',
  label: 'Classificação indicativa',
  grid: {},
  behavior: {},
  validation: {},
  appearance: {},
  options: ['Livre', '10 anos', '12 anos', '14 anos', '16 anos', '18 anos'].map((v) => ({ label: v, value: v })),
};

function Harness({ onValues }: { onValues: (v: FormValues) => void }) {
  const [values, setValues] = useState<FormValues>({});
  return (
    <form>
      <FormRenderer
        schema={{ title: '', fields: [classificacao] }}
        values={values}
        onChange={(v) => {
          setValues(v);
          onValues(v);
        }}
      />
    </form>
  );
}

describe('FormRenderer — select (classificação indicativa)', () => {
  it('abre as opções, escolhe uma e mostra no gatilho, sem enviar o formulário', () => {
    const onValues = vi.fn();
    render(<Harness onValues={onValues} />);
    const trigger = screen.getByRole('button', { name: 'Classificação indicativa' });
    expect(trigger.getAttribute('type')).toBe('button');
    expect(trigger.textContent).toContain('Selecione...');

    fireEvent.click(trigger);
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Livre', '10 anos', '12 anos', '14 anos', '16 anos', '18 anos',
    ]);
    fireEvent.click(screen.getByRole('option', { name: '16 anos' }));

    expect(onValues).toHaveBeenLastCalledWith({ classificacao_indicativa: '16 anos' });
    expect(trigger.textContent).toContain('16 anos');
  });
});
