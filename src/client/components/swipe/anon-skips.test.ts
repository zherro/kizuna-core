// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { readAnonSkips, addAnonSkip, clearAnonSkips, ANON_SKIPS_MAX } from './anon-skips';

beforeEach(() => localStorage.clear());

describe('anon-skips', () => {
  it('vazio por padrão', () => {
    expect(readAnonSkips()).toEqual([]);
  });
  it('adiciona sem duplicar', () => {
    addAnonSkip('a');
    addAnonSkip('b');
    addAnonSkip('a');
    expect(readAnonSkips()).toEqual(['b', 'a']);
  });
  it('mantém só os últimos ANON_SKIPS_MAX', () => {
    for (let i = 0; i < ANON_SKIPS_MAX + 10; i++) addAnonSkip(`u${i}`);
    const list = readAnonSkips();
    expect(list).toHaveLength(ANON_SKIPS_MAX);
    expect(list[0]).toBe('u10');
  });
  it('ignora lixo no storage', () => {
    localStorage.setItem('kizuna.swipe.anonSkips', '{nope');
    expect(readAnonSkips()).toEqual([]);
  });
  it('clear limpa', () => {
    addAnonSkip('a');
    clearAnonSkips();
    expect(readAnonSkips()).toEqual([]);
  });
});
