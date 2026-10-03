// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const setUser = vi.fn();
vi.mock('../../providers/auth-provider', () => ({ useAuth: () => ({ user: null, setUser }) }));
// Widget fake: cada montagem "resolve" o desafio com um token novo (tok-1, tok-2, ...), como o
// Turnstile real faz ao ser recriado.
let captchaMounts = 0;
vi.mock('../captcha', async () => {
  const React = await import('react');
  return {
    TurnstileWidget: ({ onToken }: { onToken: (t: string | null) => void }) => {
      React.useEffect(() => {
        captchaMounts += 1;
        onToken(`tok-${captchaMounts}`);
      }, []);
      return null;
    },
  };
});
vi.mock('next/link', () => ({ default: (p: { href: string; children: React.ReactNode }) => <a href={p.href}>{p.children}</a> }));

import { LoginForm } from './login-form';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); setUser.mockReset(); captchaMounts = 0; });

describe('LoginForm', () => {
  it('chama onSuccess com o usuário e não navega', async () => {
    const user = { uid: 'u1', name: 'A' };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'ok', user }), { status: 200 })));
    const onSuccess = vi.fn();
    render(<LoginForm onSuccess={onSuccess} />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(user));
    expect(setUser).toHaveBeenCalledWith(user);
  });

  it('com captcha: depois de credencial inválida o botão volta a liberar com um token novo', async () => {
    vi.stubEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'site-key');
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ message: 'Credenciais invalidas.' }), { status: 401 })
    );
    vi.stubGlobal('fetch', fetchMock);
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: '123456' } });
    const button = screen.getByRole('button', { name: 'Entrar' }) as HTMLButtonElement;
    await waitFor(() => expect(button.disabled).toBe(false));
    fireEvent.click(button);
    expect(await screen.findByText('Credenciais invalidas.')).toBeTruthy();
    // Sem precisar redigitar nada, o botão volta (widget recriado → tok-2).
    await waitFor(() =>
      expect((screen.getByRole('button', { name: 'Entrar' }) as HTMLButtonElement).disabled).toBe(false)
    );
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    const loginCalls = () =>
      (fetchMock.mock.calls as unknown as [string, RequestInit | undefined][]).filter(
        ([, init]) => init?.method === 'POST'
      );
    await waitFor(() => expect(loginCalls()).toHaveLength(2));
    expect(JSON.parse(String(loginCalls()[0][1]?.body)).captchaToken).toBe('tok-1');
    expect(JSON.parse(String(loginCalls()[1][1]?.body)).captchaToken).toBe('tok-2');
  });

  it('onSwitchToRegister vira botão', () => {
    const onSwitch = vi.fn();
    render(<LoginForm onSwitchToRegister={onSwitch} />);
    fireEvent.click(screen.getByRole('button', { name: 'Registre-se' }));
    expect(onSwitch).toHaveBeenCalled();
  });
});
