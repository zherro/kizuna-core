// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  redirect: (u: string) => {
    throw new Error('REDIRECT:' + u);
  },
}));
vi.mock('../../../server', () => ({ getSession: vi.fn().mockResolvedValue({ is_root: true }) }));

import { resolveKizunaScreen } from './resolve-kizuna-screen';
import { KIZUNA_SCREEN_REGISTRY } from './kizuna-screen-registry';

describe('resolveKizunaScreen', () => {
  it('notFound para slug não registrado', async () => {
    await expect(resolveKizunaScreen(['inexistente'])).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('resolve componente registrado', async () => {
    const Dummy = () => null;
    KIZUNA_SCREEN_REGISTRY['teste/x'] = { title: 'X', kind: 'component', component: Dummy };
    const { Component } = await resolveKizunaScreen(['teste', 'x']);
    expect(Component).toBe(Dummy);
    delete KIZUNA_SCREEN_REGISTRY['teste/x'];
  });
});
