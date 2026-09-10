// @vitest-environment jsdom
import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { SERVICE_WIZARD_STEPS } from './index';
import { WizardLayoutContext } from '../../wizard/wizard-layout';
import type { WizardStepProps } from '../../wizard/types';
import type { ServiceWizardState } from '../service-type';

afterEach(cleanup);

describe('SERVICE_WIZARD_STEPS', () => {
  it('tem as 8 chaves', () => {
    expect(Object.keys(SERVICE_WIZARD_STEPS).sort()).toEqual([
      'category',
      'description',
      'dynamic-form',
      'images',
      'location',
      'moderation',
      'price',
      'start',
    ]);
  });

  it('start.canContinue exige título com 5+ chars', () => {
    const cc = SERVICE_WIZARD_STEPS.start.canContinue!;
    expect(cc({ state: { title: 'abc' } } as never)).toBe(false);
    expect(cc({ state: { title: 'Barbeiro' } } as never)).toBe(true);
  });

  it('images.enabled exige resourceId', () => {
    const en = SERVICE_WIZARD_STEPS.images.enabled as (c: unknown) => boolean;
    expect(en({ resourceId: null })).toBe(false);
    expect(en({ resourceId: '7' })).toBe(true);
  });

  it('dynamic-form.enabled exige formKey na categoria + resourceId', () => {
    const en = SERVICE_WIZARD_STEPS['dynamic-form'].enabled as (c: unknown) => boolean;
    const ctx = (over: Record<string, unknown>) => ({
      resourceId: '1',
      state: { categoryId: '9' },
      entities: { categories: [{ id: '9', formKey: 'svc_extra' }] },
      ...over,
    });
    expect(en(ctx({}))).toBe(true);
    expect(en(ctx({ resourceId: null }))).toBe(false);
    expect(en(ctx({ entities: { categories: [{ id: '9', formKey: null }] } }))).toBe(false);
  });

  it('moderation.enabled só em review', () => {
    const en = SERVICE_WIZARD_STEPS.moderation.enabled as (c: unknown) => boolean;
    expect(en({ mode: 'review' })).toBe(true);
    expect(en({ mode: 'edit' })).toBe(false);
  });
});

describe('stacked (scroll) layout adaptations', () => {
  const baseCtx = (over: Partial<WizardStepProps<ServiceWizardState>> = {}) =>
    ({
      state: {
        title: '',
        groupId: 'g1',
        categoryId: '',
        subcategoryIds: [],
        description: '',
        serviceLocation: '',
        startingPrice: 0,
        priceUnit: 'quote',
        imageIds: [],
        decision: '',
        rejectionReason: '',
        decisionNote: '',
        dynamicFormValid: true,
      },
      patch: () => {},
      entities: {
        groups: [{ id: 'g1', name: 'Casa', icon: null, sortOrder: 0, description: '' }],
        categories: [{ id: 'c1', name: 'Elétrica', slug: 'eletrica', categoryGroupId: 'g1' }],
        subcategories: [],
      },
      resourceId: null,
      mode: 'create',
      persist: async () => ({ ok: true, item: null }),
      persistExtras: async () => ({ ok: true }),
      touched: new Set(),
      ...over,
    }) as unknown as WizardStepProps<ServiceWizardState>;

  it('StepCategory does not auto-open the picker when stacked', () => {
    const StepCategory = SERVICE_WIZARD_STEPS.category.Component;
    render(
      <WizardLayoutContext.Provider value={{ layout: 'scroll', stacked: true }}>
        <StepCategory {...baseCtx()} />
      </WizardLayoutContext.Provider>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('StepCategory auto-opens the picker in the stepper layout', () => {
    const StepCategory = SERVICE_WIZARD_STEPS.category.Component;
    render(<StepCategory {...baseCtx()} />);
    expect(screen.queryByRole('dialog')).not.toBeNull();
  });
});
