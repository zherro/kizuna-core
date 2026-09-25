// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const setUser = vi.fn();
vi.mock('../../providers/auth-provider', () => ({ useAuth: () => ({ user: null, setUser }) }));
vi.mock('../captcha', () => ({ TurnstileWidget: () => null }));
vi.mock('next/link', () => ({ default: (p: { href: string; children: React.ReactNode }) => <a href={p.href}>{p.children}</a> }));

import { LoginForm } from './login-form';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); setUser.mockReset(); });

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

  it('onSwitchToRegister vira botão', () => {
    const onSwitch = vi.fn();
    render(<LoginForm onSwitchToRegister={onSwitch} />);
    fireEvent.click(screen.getByRole('button', { name: 'Registre-se' }));
    expect(onSwitch).toHaveBeenCalled();
  });
});
