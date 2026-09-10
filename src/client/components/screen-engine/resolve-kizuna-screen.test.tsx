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

// Registry real puxa o screen-engine inteiro (list-block → `@/lib/server/resources`,
// que só existe num projeto consumidor). O resolver não precisa dele — fake mínimo.
const { FAKE_REGISTRY } = vi.hoisted(() => ({ FAKE_REGISTRY: {} as Record<string, unknown> }));
vi.mock('./kizuna-screen-registry', () => ({ KIZUNA_SCREEN_REGISTRY: FAKE_REGISTRY }));

import { resolveKizunaScreen } from './resolve-kizuna-screen';

describe('resolveKizunaScreen', () => {
  it('notFound para chave não registrada', async () => {
    await expect(resolveKizunaScreen(['inexistente'])).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('resolve componente registrado', async () => {
    const Dummy = () => null;
    FAKE_REGISTRY['teste/x'] = { title: 'X', component: Dummy };
    const { Component } = await resolveKizunaScreen(['teste', 'x']);
    expect(Component).toBe(Dummy);
    delete FAKE_REGISTRY['teste/x'];
  });

  it('adminOnly: redirect quando não é ADMIN nem root', async () => {
    const { getSession } = await import('../../../server');
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      is_root: false,
      tenant_type: 'USER',
    });
    FAKE_REGISTRY['adm/x'] = { title: 'X', component: () => null, adminOnly: true };
    await expect(resolveKizunaScreen(['adm', 'x'])).rejects.toThrow('REDIRECT:/painel');
    delete FAKE_REGISTRY['adm/x'];
  });
});
