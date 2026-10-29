// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createDynamicFormStep, type DynamicFormProfile } from './step-dynamic-form';
import {
  endOfLocalDayToIso,
  isoToLocalDate,
  resolveExpiresAtMode,
  validateExpiresAt,
  validatePriceProfile,
} from './price-options';
import { buildServiceWizardRegistry } from './build-registry';
import { SERVICE_WIZARD_STEPS } from './index';
import type { ServiceWizardState } from '../service-type';
import type { WizardStepContext, WizardStepProps } from '../../wizard/types';

afterEach(cleanup);

const entities = {
  groups: [{ id: 'g1', slug: 'eventos' }],
  categories: [
    { id: 'c1', slug: 'cinema', formKey: 'f1' },
    { id: 'c2', slug: 'pintor', formKey: 'f2' },
  ],
};
const profiles = (expiresAt: DynamicFormProfile['expiresAt']) => ({
  default: { expiresAt },
});

const DAY = 86_400_000;
const future = new Date(Date.now() + 5 * DAY).toISOString();
const past = new Date(Date.now() - 5 * DAY).toISOString();

const ctx = (
  state: Partial<ServiceWizardState> = {},
  extra: Partial<WizardStepContext<ServiceWizardState>> = {}
) =>
  ({
    state: {
      groupId: 'g1',
      categoryId: 'c1',
      expiresAt: null,
      dynamicFormValid: true,
      ...state,
    },
    entities: { ...entities },
    mode: 'create',
    touched: new Set(),
    ...extra,
  }) as unknown as WizardStepContext<ServiceWizardState>;

describe('resolveExpiresAtMode / perfis', () => {
  it('ausente/false = hidden; true/optional = optional; required = required', () => {
    expect(resolveExpiresAtMode({})).toBe('hidden');
    expect(resolveExpiresAtMode({ expiresAt: false })).toBe('hidden');
    expect(resolveExpiresAtMode({ expiresAt: true })).toBe('optional');
    expect(resolveExpiresAtMode({ expiresAt: 'optional' })).toBe('optional');
    expect(resolveExpiresAtMode({ expiresAt: 'required' })).toBe('required');
  });

  it('o passo de preço não aceita mais expiresAt (a validade vive no dynamic-form)', () => {
    expect(() => validatePriceProfile({ options: [{ value: 'quote' }] })).not.toThrow();
    expect(() =>
      validatePriceProfile({ options: [{ value: 'quote' }], expiresAt: 'required' } as never)
    ).toThrow(/dynamic-form/);
  });

  it('buildServiceWizardRegistry valida o perfil do dynamic-form no boot', () => {
    expect(() =>
      buildServiceWizardRegistry(SERVICE_WIZARD_STEPS, {
        resource: 'services',
        steps: ['dynamic-form'],
        stepProfiles: { 'dynamic-form': { default: { expiresAt: 'x' as never } } },
      })
    ).toThrow(/expiresAt/);
  });

  it('buildServiceWizardRegistry recusa expiresAt no perfil de preço', () => {
    expect(() =>
      buildServiceWizardRegistry(SERVICE_WIZARD_STEPS, {
        resource: 'services',
        steps: ['price'],
        stepProfiles: {
          price: { default: { options: [{ value: 'quote' }], expiresAt: true } as never },
        },
      })
    ).toThrow(/dynamic-form/);
  });
});

describe('helpers de data', () => {
  it('endOfLocalDayToIso: fim do dia local; roundtrip com isoToLocalDate', () => {
    const iso = endOfLocalDayToIso('2030-06-15')!;
    const d = new Date(iso);
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([
      2030, 5, 15, 23, 59,
    ]);
    expect(isoToLocalDate(iso)).toBe('2030-06-15');
  });
  it('rejeita vazio e datas inexistentes', () => {
    expect(endOfLocalDayToIso('')).toBeNull();
    expect(endOfLocalDayToIso('2026-02-31')).toBeNull();
    expect(isoToLocalDate(null)).toBe('');
    expect(isoToLocalDate('lixo')).toBe('');
  });
  it('validateExpiresAt', () => {
    expect(validateExpiresAt('hidden', null, true)).toBeNull();
    expect(validateExpiresAt('optional', null, true)).toBeNull();
    expect(validateExpiresAt('required', null, true)).toBe('required');
    expect(validateExpiresAt('optional', past, true)).toBe('past');
    expect(validateExpiresAt('optional', past, false)).toBeNull();
    expect(validateExpiresAt('required', future, true)).toBeNull();
  });
});

describe('createDynamicFormStep — canContinue', () => {
  const cc = (p: DynamicFormProfile['expiresAt'], c: WizardStepContext<ServiceWizardState>) =>
    createDynamicFormStep(profiles(p)).canContinue!(c);

  it('hidden ignora a data', () => {
    expect(cc(undefined, ctx({ expiresAt: past }))).toBe(true);
  });
  it('optional: vazio ok; futura ok; passada barra em create', () => {
    expect(cc('optional', ctx())).toBe(true);
    expect(cc(true, ctx({ expiresAt: future }))).toBe(true);
    expect(cc('optional', ctx({ expiresAt: past }))).toBe(false);
  });
  it('required: exige data preenchida e não passada', () => {
    expect(cc('required', ctx())).toBe(false);
    expect(cc('required', ctx({ expiresAt: past }))).toBe(false);
    expect(cc('required', ctx({ expiresAt: future }))).toBe(true);
  });
  it('formulário inválido continua barrando', () => {
    expect(cc('optional', ctx({ dynamicFormValid: false }))).toBe(false);
  });
  it('edit/review: data já vencida não barra, a menos que o usuário a tenha alterado', () => {
    expect(cc('required', ctx({ expiresAt: past }, { mode: 'edit' }))).toBe(true);
    expect(cc('optional', ctx({ expiresAt: past }, { mode: 'review' }))).toBe(true);
    const touched = new Set(['expiresAt']) as never;
    expect(cc('optional', ctx({ expiresAt: past }, { mode: 'edit', touched }))).toBe(false);
    // required vazio continua barrando em edit
    expect(cc('required', ctx({}, { mode: 'edit' }))).toBe(false);
  });
  it('byCategory substitui o perfil por inteiro', () => {
    const step = createDynamicFormStep({
      default: {},
      byCategory: { cinema: { expiresAt: 'required' } },
    });
    expect(step.canContinue!(ctx({ categoryId: 'c1' }))).toBe(false); // cinema: obrigatório
    expect(step.canContinue!(ctx({ categoryId: 'c2' }))).toBe(true); // default: oculto
  });
});

describe('createDynamicFormStep — persist', () => {
  const run = async (p: DynamicFormProfile['expiresAt'], state: Partial<ServiceWizardState>) => {
    const persist = vi.fn().mockResolvedValue({ ok: true, item: null });
    const c = ctx(state, { persist, persistExtras: vi.fn() });
    // as respostas do formulário têm o próprio persist; aqui só importa o que vai pro service
    (c.entities as Record<string, unknown>).dynamicFormRef = {
      current: { persist: async () => true, getValues: () => ({}) },
    };
    await createDynamicFormStep(profiles(p)).persist!(c);
    return persist.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
  };
  it('optional/required enviam expiresAt ao service (inclusive null pra limpar)', async () => {
    expect(await run('required', { expiresAt: future })).toMatchObject({ expiresAt: future });
    const cleared = await run('optional', { expiresAt: null });
    expect(cleared && 'expiresAt' in cleared).toBe(true);
    expect(cleared?.expiresAt).toBeNull();
  });
  it('hidden não envia a chave (preserva o valor do baseline)', async () => {
    expect(await run(undefined, { expiresAt: future })).toBeUndefined();
  });
});

describe('dynamic-form — campo de validade', () => {
  const renderStep = (
    p: DynamicFormProfile,
    state: Partial<ServiceWizardState>,
    patch = vi.fn()
  ) => {
    const C = createDynamicFormStep({ default: p }).Component;
    const props = {
      ...ctx(state),
      patch,
      resourceId: 1,
    } as unknown as WizardStepProps<ServiceWizardState>;
    return render(<C {...props} />);
  };

  it('hidden: sem campo', () => {
    renderStep({}, {});
    expect(screen.queryByLabelText(/Válido até/)).toBeNull();
  });
  it('optional: rótulo com (opcional); required: sem', () => {
    renderStep({ expiresAt: 'optional' }, {});
    expect(screen.getByLabelText(/Válido até \(opcional\)/)).toBeTruthy();
    cleanup();
    renderStep({ expiresAt: 'required' }, {});
    expect(screen.getByLabelText('Válido até')).toBeTruthy();
  });
  it('rótulo vem do perfil (ex.: Acontece em)', () => {
    renderStep({ expiresAt: 'required', expiresAtLabels: { label: 'Acontece em' } }, {});
    expect(screen.getByLabelText('Acontece em')).toBeTruthy();
  });
  it('exibe a data local e grava fim do dia em ISO; limpar manda null', () => {
    const patch = vi.fn();
    renderStep({ expiresAt: 'optional' }, { expiresAt: endOfLocalDayToIso('2030-06-15') }, patch);
    const input = screen.getByLabelText(/Válido até/) as HTMLInputElement;
    expect(input.value).toBe('2030-06-15');
    fireEvent.change(input, { target: { value: '2030-07-01' } });
    expect(patch).toHaveBeenCalledWith({ expiresAt: endOfLocalDayToIso('2030-07-01') });
    fireEvent.click(screen.getByRole('button', { name: 'Limpar data' }));
    expect(patch).toHaveBeenCalledWith({ expiresAt: null });
  });
});
