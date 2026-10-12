// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

const oneTap = vi.fn();
vi.mock('./google-one-tap', () => ({
  GoogleOneTap: (p: { active: boolean; returnTo?: string }) => {
    oneTap(p);
    return null;
  },
}));

import { SocialLoginButtons } from './social-login-buttons';
import { GoogleOneTapModeContext } from '../../providers/google-one-tap-mode';

function stubProviders(providers: { id: string; label: string }[]) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ providers }), { status: 200 })));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  oneTap.mockReset();
});

describe('SocialLoginButtons — One Tap junto do formulário', () => {
  it('com Google configurado, liga o One Tap (padrão: só onde há formulário de login)', async () => {
    stubProviders([{ id: 'google', label: 'Google' }]);
    render(<SocialLoginButtons returnTo="/x" />);
    await screen.findByRole('button', { name: 'Continuar com Google' });
    expect(oneTap).toHaveBeenLastCalledWith({ active: true, returnTo: '/x' });
  });

  it('googleOneTap={false} no provider desliga', async () => {
    stubProviders([{ id: 'google', label: 'Google' }]);
    render(
      <GoogleOneTapModeContext.Provider value={false}>
        <SocialLoginButtons />
      </GoogleOneTapModeContext.Provider>
    );
    await screen.findByRole('button', { name: 'Continuar com Google' });
    expect(oneTap).toHaveBeenLastCalledWith(expect.objectContaining({ active: false }));
  });

  it('modo "everywhere": o AuthProvider já monta o global, aqui não duplica', async () => {
    stubProviders([{ id: 'google', label: 'Google' }]);
    render(
      <GoogleOneTapModeContext.Provider value="everywhere">
        <SocialLoginButtons />
      </GoogleOneTapModeContext.Provider>
    );
    await screen.findByRole('button', { name: 'Continuar com Google' });
    expect(oneTap).toHaveBeenLastCalledWith(expect.objectContaining({ active: false }));
  });

  it('sem Google na lista de provedores, não monta o One Tap', async () => {
    stubProviders([]);
    render(<SocialLoginButtons />);
    await new Promise((r) => setTimeout(r, 0));
    expect(oneTap).not.toHaveBeenCalled();
  });
});
