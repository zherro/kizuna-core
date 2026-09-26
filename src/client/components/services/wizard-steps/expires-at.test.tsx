// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AppPreferencesProvider } from '../../../providers/app-preferences-provider';
import { createPriceStep } from './step-price';
import {
  endOfLocalDayToIso,
  isoToLocalDate,
  resolveExpiresAtMode,
  validateExpiresAt,
  validatePriceProfile,
  type PriceProfile,
} from './price-options';
import { buildServiceWizardRegistry } from './build-registry';
import { SERVICE_WIZARD_STEPS } from './index';
import type { ServiceWizardState } from '../service-type';
import type { WizardStepContext, WizardStepProps } from '../../wizard/types';

afterEach(cleanup);

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
  })) as unknown as typeof window.matchMedia;
}

const entities = {
  groups: [{ id: 'g1', slug: 'eventos' }],
  categories: [
    { id: 'c1', slug: 'cinema' },
    { id: 'c2', slug: 'pintor' },
  ],
};
const opts = [{ value: 'quote' }];
const profiles = (expiresAt: PriceProfile['expiresAt']) => ({
  default: { options: opts, expiresAt },
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
      priceUnit: 'quote',
      startingPrice: 0,
      expiresAt: null,
      ...state,
    },
    entities,
    mode: 'create',
    touched: new Set(),
    ...extra,
  }) as unknown as WizardStepContext<ServiceWizardState>;

describe('resolveExpiresAtMode / validatePriceProfile', () => {
  it('ausente/false = hidden; true/optional = optional; required = required', () => {
    expect(resolveExpiresAtMode({ options: opts })).toBe('hidden');
    expect(resolveExpiresAtMode({ options: opts, expiresAt: false })).toBe('hidden');
    expect(resolveExpiresAtMode({ options: opts, expiresAt: true })).toBe('optional');
    expect(resolveExpiresAtMode({ options: opts, expiresAt: 'optional' })).toBe('optional');
    expect(resolveExpiresAtMode({ options: opts, expiresAt: 'required' })).toBe('required');
  });

  it('validatePriceProfile rejeita expiresAt inválido', () => {
    expect(() => validatePriceProfile({ options: opts, expiresAt: 'required' })).not.toThrow();
    expect(() => validatePriceProfile({ options: opts, expiresAt: true })).not.toThrow();
    expect(() => validatePriceProfile({ options: opts, expiresAt: 'sempre' as never })).toThrow(
      /expiresAt/
    );
    expect(() => validatePriceProfile({ options: opts, expiresAt: 1 as never })).toThrow(
      /expiresAt/
    );
  });

  it('buildServiceWizardRegistry valida o perfil no boot', () => {
    expect(() =>
      buildServiceWizardRegistry(SERVICE_WIZARD_STEPS, {
        resource: 'services',
        steps: ['price'],
        stepProfiles: { price: { default: { options: opts, expiresAt: 'x' as never } } },
      })
    ).toThrow(/expiresAt/);
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

describe('createPriceStep — canContinue', () => {
  const cc = (p: PriceProfile['expiresAt'], c: WizardStepContext<ServiceWizardState>) =>
    createPriceStep(profiles(p)).canContinue!(c);

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
  it('edit/review: data já vencida não barra, a menos que o usuário a tenha alterado', () => {
    expect(cc('required', ctx({ expiresAt: past }, { mode: 'edit' }))).toBe(true);
    expect(cc('optional', ctx({ expiresAt: past }, { mode: 'review' }))).toBe(true);
    const touched = new Set(['expiresAt']) as never;
    expect(cc('optional', ctx({ expiresAt: past }, { mode: 'edit', touched }))).toBe(false);
    // required vazio continua barrando em edit
    expect(cc('required', ctx({}, { mode: 'edit' }))).toBe(false);
  });
  it('byCategory substitui o perfil por inteiro', () => {
    const step = createPriceStep({
      default: { options: opts },
      byCategory: { cinema: { options: opts, expiresAt: 'required' } },
    });
    expect(step.canContinue!(ctx({ categoryId: 'c1' }))).toBe(false); // cinema: obrigatório
    expect(step.canContinue!(ctx({ categoryId: 'c2' }))).toBe(true); // default: oculto
  });
});

describe('createPriceStep — persist', () => {
  const run = async (p: PriceProfile['expiresAt'], state: Partial<ServiceWizardState>) => {
    const persist = vi.fn().mockResolvedValue({ ok: true, item: null });
    const persistExtras = vi.fn().mockResolvedValue({ ok: true });
    await createPriceStep(profiles(p)).persist!(ctx(state, { persist, persistExtras }));
    return persist.mock.calls[0][0] as Record<string, unknown>;
  };
  it('optional/required enviam expiresAt (inclusive null pra limpar)', async () => {
    expect(await run('required', { expiresAt: future })).toMatchObject({ expiresAt: future });
    const cleared = await run('optional', { expiresAt: null });
    expect('expiresAt' in cleared).toBe(true);
    expect(cleared.expiresAt).toBeNull();
  });
  it('hidden não envia a chave (preserva o valor do baseline)', async () => {
    const payload = await run(undefined, { expiresAt: future });
    expect('expiresAt' in payload).toBe(false);
  });
});

describe('StepPrice — campo Válido até', () => {
  const renderStep = (
    p: PriceProfile['expiresAt'],
    state: Partial<ServiceWizardState>,
    patch = vi.fn()
  ) => {
    const C = createPriceStep(profiles(p)).Component;
    const props = { ...ctx(state), patch } as unknown as WizardStepProps<ServiceWizardState>;
    return render(
      <AppPreferencesProvider>
        <C {...props} />
      </AppPreferencesProvider>
    );
  };

  it('hidden: sem campo', () => {
    renderStep(undefined, {});
    expect(screen.queryByLabelText(/Válido até/)).toBeNull();
  });
  it('optional: rótulo com (opcional); required: sem', () => {
    renderStep('optional', {});
    expect(screen.getByLabelText(/Válido até \(opcional\)/)).toBeTruthy();
    cleanup();
    renderStep('required', {});
    expect(screen.getByLabelText('Válido até')).toBeTruthy();
  });
  it('exibe a data local e grava fim do dia em ISO; limpar manda null', () => {
    const patch = vi.fn();
    renderStep('optional', { expiresAt: endOfLocalDayToIso('2030-06-15') }, patch);
    const input = screen.getByLabelText(/Válido até/) as HTMLInputElement;
    expect(input.value).toBe('2030-06-15');
    fireEvent.change(input, { target: { value: '2030-07-01' } });
    expect(patch).toHaveBeenCalledWith({ expiresAt: endOfLocalDayToIso('2030-07-01') });
    fireEvent.click(screen.getByRole('button', { name: 'Limpar data' }));
    expect(patch).toHaveBeenCalledWith({ expiresAt: null });
  });
});
