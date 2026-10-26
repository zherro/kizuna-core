// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { StepDynamicForm, getDynamicFormHolder } from './step-dynamic-form';

afterEach(cleanup);

const fld = (key: string) => ({ id: key, key, name: key, label: key, type: 'text', grid: {}, behavior: {}, validation: {}, appearance: {} });

describe('StepDynamicForm', () => {
  it('o persist do registry grava as respostas carregadas (holder não fica com valores velhos)', async () => {
    const sent: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (String(url).includes('/api/postgrest/rpc')) {
          sent.push(String(init?.body));
          return { ok: true, json: async () => ({ payload: { answers: {} } }) };
        }
        if (String(url).includes('form_results'))
          return { ok: true, json: async () => ({ items: [{ id: 1, answers: { nome: 'Nando Reis' } }] }) };
        return { ok: true, json: async () => ({ items: [{ schema: { fields: [fld('nome')] } }] }) };
      })
    );
    // `patch` é um mock: o pai não re-renderiza quando o filho muda (caso real quando a validade não muda).
    const props = {
      resourceId: 110,
      state: { categoryId: 5 },
      patch: vi.fn(),
      entities: { categories: [{ id: 5, formKey: 'eventos' }] },
    } as never;
    render(<StepDynamicForm {...(props as object as never)} />);
    await waitFor(() => expect(screen.getByDisplayValue('Nando Reis')).toBeTruthy());
    await getDynamicFormHolder(props).current!.persist();
    expect(JSON.parse(sent[0]).params.p_answers).toEqual({ nome: 'Nando Reis' });
  });
});
