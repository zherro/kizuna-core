import { it, expect } from 'vitest';
import { classify } from './diff3.mjs';

it('noop quando live == locked', () => {
  expect(classify('sha256:a', 'sha256:a', 'sha256:x')).toBe('noop');
});
it('fast-forward quando arquivo ausente no projeto', () => {
  expect(classify('sha256:b', 'sha256:a', null)).toBe('fast-forward');
});
it('fast-forward quando current == locked', () => {
  expect(classify('sha256:b', 'sha256:a', 'sha256:a')).toBe('fast-forward');
});
it('conflict quando todos diferem', () => {
  expect(classify('sha256:b', 'sha256:a', 'sha256:c')).toBe('conflict');
});
