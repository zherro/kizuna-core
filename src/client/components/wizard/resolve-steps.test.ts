import { describe, expect, it } from 'vitest';
import { defineWizard } from './define-wizard';
import { resolveSteps } from './resolve-steps';

const stub = (key: string, extra = {}) => ({ key, label: key, Component: () => null, ...extra });
const ctx = {
  state: {},
  patch: () => {},
  entities: {},
  resourceId: null,
  mode: 'create' as const,
  persist: async () => ({ ok: true }),
};

describe('resolveSteps', () => {
  it('resolve strings pelo registry', () => {
    const cfg = defineWizard({ resource: 'x', steps: ['a', 'b'], registry: { a: stub('a'), b: stub('b') } });
    expect(resolveSteps(cfg, ctx).map((s) => s.key)).toEqual(['a', 'b']);
  });

  it('disable remove step registrado', () => {
    const cfg = defineWizard({ resource: 'x', steps: ['a', 'b'], disable: ['b'], registry: { a: stub('a'), b: stub('b') } });
    expect(resolveSteps(cfg, ctx).map((s) => s.key)).toEqual(['a']);
  });

  it('after posiciona step custom depois do alvo', () => {
    const cfg = defineWizard({
      resource: 'x',
      steps: ['a', 'b', { ...stub('c'), after: 'a' }],
      registry: { a: stub('a'), b: stub('b') },
    });
    expect(resolveSteps(cfg, ctx).map((s) => s.key)).toEqual(['a', 'c', 'b']);
  });

  it('enabled=false esconde o step', () => {
    const cfg = defineWizard({
      resource: 'x', steps: ['a', 'b'],
      registry: { a: stub('a'), b: stub('b', { enabled: () => false }) },
    });
    expect(resolveSteps(cfg, ctx).map((s) => s.key)).toEqual(['a']);
  });

  it('defineWizard rejeita after apontando pra chave inexistente', () => {
    expect(() => defineWizard({ resource: 'x', steps: [{ ...stub('c'), after: 'zzz' }] })).toThrow(/zzz/);
  });
});
