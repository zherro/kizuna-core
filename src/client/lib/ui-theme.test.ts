import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveUiStyle } from './ui-theme';

afterEach(() => vi.unstubAllEnvs());

describe('resolveUiStyle', () => {
  it('lê soft da env, sem diferenciar caixa/espaço', () => {
    vi.stubEnv('NEXT_PUBLIC_UI_STYLE', ' Soft ');
    expect(resolveUiStyle()).toBe('soft');
  });
  it('cai em classic sem env', () => {
    vi.stubEnv('NEXT_PUBLIC_UI_STYLE', undefined);
    expect(resolveUiStyle()).toBe('classic');
  });
  it('cai em classic com valor desconhecido', () => {
    vi.stubEnv('NEXT_PUBLIC_UI_STYLE', 'app');
    expect(resolveUiStyle()).toBe('classic');
  });
});
