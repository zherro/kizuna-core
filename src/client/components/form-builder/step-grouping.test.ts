import { describe, it, expect } from 'vitest';
import { groupFieldsIntoSteps } from './step-grouping';
import type { FormField } from './types';

function field(partial: Partial<FormField> & Pick<FormField, 'key' | 'type'>): FormField {
  return {
    id: partial.key,
    name: partial.key,
    label: partial.key,
    grid: {},
    behavior: {},
    validation: {},
    appearance: {},
    ...partial,
  };
}

const opts = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ label: `Opção ${i + 1}`, value: `opcao_${i + 1}` }));

describe('groupFieldsIntoSteps', () => {
  it('gives a textarea its own step', () => {
    const fields = [field({ key: 'descricao', type: 'textarea' })];
    expect(groupFieldsIntoSteps(fields)).toEqual([fields]);
  });

  it('bundles up to 2 compact radio/multiselect fields into one step', () => {
    const urgencia = field({ key: 'urgencia', type: 'radio', options: opts(3) });
    const local = field({ key: 'local', type: 'radio', options: opts(3) });
    expect(groupFieldsIntoSteps([urgencia, local])).toEqual([[urgencia, local]]);
  });

  it('starts a new step once the compact bundle is full', () => {
    const a = field({ key: 'a', type: 'radio', options: opts(2) });
    const b = field({ key: 'b', type: 'radio', options: opts(2) });
    const c = field({ key: 'c', type: 'radio', options: opts(2) });
    expect(groupFieldsIntoSteps([a, b, c])).toEqual([[a, b], [c]]);
  });

  it('does not bundle a radio/multiselect field with too many options', () => {
    const compact = field({ key: 'compact', type: 'radio', options: opts(3) });
    const wide = field({ key: 'wide', type: 'multiselect', options: opts(10) });
    expect(groupFieldsIntoSteps([compact, wide], { compactMaxOptions: 6 })).toEqual([
      [compact],
      [wide],
    ]);
  });

  it('interleaves compact and non-compact fields into separate steps in order', () => {
    const category = field({ key: 'category', type: 'select', options: opts(20) });
    const urgencia = field({ key: 'urgencia', type: 'radio', options: opts(3) });
    const local = field({ key: 'local', type: 'radio', options: opts(3) });
    const descricao = field({ key: 'descricao', type: 'textarea' });
    expect(groupFieldsIntoSteps([category, urgencia, local, descricao])).toEqual([
      [category],
      [urgencia, local],
      [descricao],
    ]);
  });

  it('attaches a layout-only field (heading/divider) to the next value-holding field step', () => {
    const heading = field({ key: 'h1', type: 'heading' });
    const urgencia = field({ key: 'urgencia', type: 'radio', options: opts(3) });
    expect(groupFieldsIntoSteps([heading, urgencia])).toEqual([[heading, urgencia]]);
  });
});
