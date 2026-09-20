import { describe, expect, it } from 'vitest';
import { createWizardFromJson } from './from-config';
import type { WizardStep } from './types';

const step = (key: string): WizardStep => ({ key, label: key, Component: () => null });
const registry = { a: step('a'), b: step('b'), c: step('c') };

describe('createWizardFromJson', () => {
  it('aplica defaults: stepper, layout travado, sem IA', () => {
    const r = createWizardFromJson({ resource: 'services', steps: ['a', 'b'] }, registry);
    expect(r.layoutProps).toEqual({ variant: 'stepper', lockLayout: true });
    expect(r.assistantEnabled).toBe(false);
    expect(r.config.steps).toEqual(['a', 'b']);
  });

  it('respeita layout, lockLayout, assistant e disable do JSON', () => {
    const r = createWizardFromJson(
      {
        resource: 'services',
        steps: ['a', 'b', 'c'],
        disable: ['b'],
        layout: 'scroll',
        lockLayout: false,
        assistant: true,
      },
      registry
    );
    expect(r.layoutProps).toEqual({ variant: 'scroll', lockLayout: false });
    expect(r.assistantEnabled).toBe(true);
    expect(r.config.disable).toEqual(['b']);
  });

  it('falha em step desconhecido e layout inválido', () => {
    expect(() => createWizardFromJson({ resource: 'x', steps: ['zzz'] }, registry)).toThrow(/zzz/);
    expect(() =>
      createWizardFromJson({ resource: 'x', steps: ['a'], layout: 'grid' as never }, registry)
    ).toThrow(/layout/);
  });
});
