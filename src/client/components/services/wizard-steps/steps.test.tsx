// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { SERVICE_WIZARD_STEPS } from './index';

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
