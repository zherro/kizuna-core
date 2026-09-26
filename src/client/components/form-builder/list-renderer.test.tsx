// @vitest-environment jsdom
import { useState } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { FormRenderer } from './FormRenderer';
import { FormResultViewer } from './FormResultViewer';
import type { FormField, FormSchema, FormValues } from './types';

afterEach(cleanup);

function f(partial: Partial<FormField> & Pick<FormField, 'key' | 'type'>): FormField {
  return {
    id: partial.key,
    name: partial.key,
    label: partial.label ?? partial.key,
    grid: {},
    behavior: {},
    validation: {},
    appearance: {},
    ...partial,
  };
}

const list = (over: Partial<FormField> = {}) =>
  f({
    key: 'sessoes',
    type: 'list',
    label: 'Sessões',
    itemLabel: 'Sessão',
    itemFields: [
      f({ key: 'data', type: 'text', label: 'Data', behavior: { required: true } }),
      f({ key: 'sala', type: 'text', label: 'Sala' }),
    ],
    ...over,
  });

function Harness({
  field,
  initial = {},
  onSubmit,
  onValues,
}: {
  field: FormField;
  initial?: FormValues;
  onSubmit?: (v: FormValues) => void;
  onValues?: (v: FormValues) => void;
}) {
  const [values, setValues] = useState<FormValues>(initial);
  const schema: FormSchema = { title: '', fields: [field] };
  return (
    <FormRenderer
      schema={schema}
      values={values}
      widthOverride={1280}
      onChange={(v) => {
        setValues(v);
        onValues?.(v);
      }}
      onSubmit={onSubmit}
    />
  );
}

describe('FormRenderer list', () => {
  it('adds and removes items', () => {
    let last: FormValues = {};
    render(<Harness field={list()} onValues={(v) => (last = v)} />);
    expect(screen.getByText('Nenhum item adicionado.')).toBeTruthy();
    fireEvent.click(screen.getByText(/Adicionar sessão/));
    fireEvent.click(screen.getByText(/Adicionar sessão/));
    expect(screen.getByText('Sessão 1')).toBeTruthy();
    expect(screen.getByText('Sessão 2')).toBeTruthy();
    expect((last.sessoes as unknown[]).length).toBe(2);
    fireEvent.click(screen.getByLabelText('Remover Sessão 1'));
    expect((last.sessoes as unknown[]).length).toBe(1);
    expect(screen.queryByText('Sessão 2')).toBeNull();
  });

  it('edits a cell and reorders items', () => {
    let last: FormValues = {};
    render(
      <Harness
        field={list()}
        initial={{ sessoes: [{ data: 'A' }, { data: 'B' }] }}
        onValues={(v) => (last = v)}
      />
    );
    const inputs = screen.getAllByLabelText(/Data/) as HTMLInputElement[];
    expect(inputs.map((i) => i.value)).toEqual(['A', 'B']);
    fireEvent.change(inputs[0], { target: { value: 'A2' } });
    expect((last.sessoes as { data: string }[])[0].data).toBe('A2');
    fireEvent.click(screen.getByLabelText('Descer Sessão 1'));
    expect((last.sessoes as { data: string }[]).map((r) => r.data)).toEqual(['B', 'A2']);
    expect(screen.getByLabelText('Subir Sessão 1').hasAttribute('disabled')).toBe(true);
  });

  it('respects maxItems', () => {
    render(<Harness field={list({ maxItems: 1 })} initial={{ sessoes: [{ data: 'A' }] }} />);
    const add = screen.getByText(/Adicionar sessão/).closest('button')!;
    expect(add.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('1/1')).toBeTruthy();
  });

  it('shows the error on the right cell and blocks submit', () => {
    const onSubmit = vi.fn();
    render(
      <Harness
        field={list()}
        initial={{ sessoes: [{ data: 'A' }, { sala: 'S2' }] }}
        onSubmit={onSubmit}
      />
    );
    fireEvent.click(screen.getByText('Enviar'));
    expect(onSubmit).not.toHaveBeenCalled();
    const items = document.querySelectorAll('[data-list-item]');
    expect(items[0].textContent).not.toContain('Campo obrigatório.');
    expect(items[1].textContent).toContain('Campo obrigatório.');
  });

  it('submits the cleaned array', () => {
    const onSubmit = vi.fn();
    render(
      <Harness
        field={list()}
        initial={{ sessoes: [{ data: 'A', sala: '' }, {}] }}
        onSubmit={onSubmit}
      />
    );
    fireEvent.click(screen.getByText('Enviar'));
    expect(onSubmit).toHaveBeenCalledWith({ sessoes: [{ data: 'A' }] });
  });

  it('readOnly disables add/remove/reorder and inputs', () => {
    render(
      <Harness
        field={list({ behavior: { readOnly: true } })}
        initial={{ sessoes: [{ data: 'A' }] }}
      />
    );
    expect(screen.queryByText(/Adicionar sessão/)).toBeNull();
    expect(screen.queryByLabelText('Remover Sessão 1')).toBeNull();
    expect((screen.getByLabelText(/Data/) as HTMLInputElement).disabled).toBe(true);
  });
});

describe('FormResultViewer list', () => {
  it('renders the list as a table with sub-field labels', () => {
    const schema: FormSchema = { title: '', fields: [list()] };
    render(
      <FormResultViewer
        schema={schema}
        values={{ sessoes: [{ data: '2026-10-01', sala: 'Sala 3' }, {}] }}
      />
    );
    expect(screen.getByText('Data')).toBeTruthy();
    expect(screen.getByText('Sala')).toBeTruthy();
    expect(screen.getByText('2026-10-01')).toBeTruthy();
    expect(screen.getByText('Sala 3')).toBeTruthy();
    expect(document.querySelectorAll('tbody tr').length).toBe(1);
  });
});
