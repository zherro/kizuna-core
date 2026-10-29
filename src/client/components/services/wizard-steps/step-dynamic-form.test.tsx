// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import {
  StepDynamicForm,
  createDynamicFormStep,
  getDynamicFormHolder,
  validateDynamicFormProfile,
} from './step-dynamic-form';

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

describe('createDynamicFormStep (validade no topo)', () => {
  const profiles = {
    byGroup: {
      eventos: { expiresAt: 'required' as const, expiresAtLabels: { label: 'Acontece em' } },
    },
  };
  const entities = {
    groups: [{ id: 1, slug: 'eventos' }, { id: 2, slug: 'outros' }],
    categories: [{ id: 5, slug: 'show', formKey: 'eventos' }],
  };
  const ctx = (groupId: number, expiresAt: string | null, touched: unknown[] = []) =>
    ({
      mode: 'edit',
      entities,
      touched: new Set(touched),
      state: { groupId, categoryId: 5, expiresAt, dynamicFormValid: true },
    }) as never;

  it('exige a data só no grupo configurado', () => {
    const step = createDynamicFormStep(profiles);
    expect(step.canContinue?.(ctx(1, null))).toBe(false);
    expect(step.canContinue?.(ctx(1, '2999-01-01T02:59:59.999Z'))).toBe(true);
    expect(step.canContinue?.(ctx(2, null))).toBe(true);
  });

  it('data no passado só barra depois que o usuário mexe nela', () => {
    const step = createDynamicFormStep(profiles);
    expect(step.canContinue?.(ctx(1, '2000-01-01T00:00:00.000Z'))).toBe(true);
    expect(step.canContinue?.(ctx(1, '2000-01-01T00:00:00.000Z', ['expiresAt']))).toBe(false);
  });

  it('mostra o campo com o rótulo do perfil acima do formulário', () => {
    const { Component } = createDynamicFormStep(profiles);
    render(
      <Component
        {...({
          mode: 'edit',
          resourceId: 110,
          entities,
          touched: new Set(),
          patch: vi.fn(),
          state: { groupId: 1, categoryId: 5, expiresAt: null },
        } as never)}
      />
    );
    expect(screen.getByLabelText('Acontece em')).toBeTruthy();
  });

  it('sem perfil o campo não aparece', () => {
    const { Component } = createDynamicFormStep();
    render(
      <Component
        {...({
          mode: 'edit',
          resourceId: 110,
          entities,
          touched: new Set(),
          patch: vi.fn(),
          state: { groupId: 1, categoryId: 5, expiresAt: null },
        } as never)}
      />
    );
    expect(screen.queryByLabelText('Acontece em')).toBeNull();
  });

  it('valida expiresAt do perfil', () => {
    expect(() => validateDynamicFormProfile({ expiresAt: 'sempre' as never })).toThrow(/expiresAt/);
    expect(() => validateDynamicFormProfile({ expiresAt: 'required' })).not.toThrow();
  });
});
