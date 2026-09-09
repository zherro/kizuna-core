import { describe, expect, it } from 'vitest';
import { applyAssistPatch } from './apply-assist-patch';

describe('applyAssistPatch', () => {
  it('preenche campo vazio e intocado', () => {
    const out = applyAssistPatch({ title: 'IA', description: 'D' }, { title: '', description: 'já' }, new Set());
    expect(out).toEqual({ title: 'IA' });
  });
  it('nunca sobrescreve campo tocado', () => {
    const out = applyAssistPatch({ title: 'IA' }, { title: '' }, new Set(['title']));
    expect(out).toEqual({});
  });
  it('always força mesmo com valor presente', () => {
    const out = applyAssistPatch({ title: 'IA' }, { title: 'velho' }, new Set(), { always: ['title'] });
    expect(out).toEqual({ title: 'IA' });
  });
  it('trata [] e 0 como vazio', () => {
    const out = applyAssistPatch({ tags: ['x'], price: 5 }, { tags: [], price: 0 }, new Set());
    expect(out).toEqual({ tags: ['x'], price: 5 });
  });
});
