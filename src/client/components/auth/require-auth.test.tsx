// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react';

let mockUser: unknown = null;
vi.mock('../../providers/auth-provider', () => ({ useAuth: () => ({ user: mockUser, setUser: vi.fn() }) }));
vi.mock('./login-form', () => ({
  LoginForm: (p: { onSuccess: (u: unknown) => void }) => (
    <button onClick={() => p.onSuccess({ uid: 'u1' })}>fake-login</button>
  ),
}));
vi.mock('./register-form', () => ({ RegisterForm: () => <div>fake-register</div> }));

import { RequireAuthProvider, useRequireAuth } from './require-auth';

function Btn({ fn }: { fn: () => void }) {
  const requireAuth = useRequireAuth();
  return <button onClick={() => requireAuth(fn, 'like:u9')}>curtir</button>;
}

afterEach(() => { cleanup(); mockUser = null; sessionStorage.clear(); });

describe('RequireAuth', () => {
  it('logado executa direto', () => {
    mockUser = { uid: 'u1' };
    const fn = vi.fn();
    render(<RequireAuthProvider><Btn fn={fn} /></RequireAuthProvider>);
    fireEvent.click(screen.getByText('curtir'));
    expect(fn).toHaveBeenCalledOnce();
    expect(screen.queryByText('fake-login')).toBeNull();
  });

  it('anônimo abre modal e executa após login', async () => {
    const fn = vi.fn();
    render(<RequireAuthProvider><Btn fn={fn} /></RequireAuthProvider>);
    fireEvent.click(screen.getByText('curtir'));
    expect(fn).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('kizuna.auth.pending')).toBe('like:u9');
    fireEvent.click(screen.getByText('fake-login'));
    // a ação roda depois do popstate da entrada do modal (history.back assíncrono)
    await waitFor(() => expect(fn).toHaveBeenCalledOnce());
    expect(sessionStorage.getItem('kizuna.auth.pending')).toBeNull();
    expect(screen.queryByText('fake-login')).toBeNull();
  });

  it('X fecha sem executar', () => {
    const fn = vi.fn();
    render(<RequireAuthProvider><Btn fn={fn} /></RequireAuthProvider>);
    fireEvent.click(screen.getByText('curtir'));
    fireEvent.click(screen.getByLabelText('Fechar'));
    expect(fn).not.toHaveBeenCalled();
    expect(screen.queryByText('fake-login')).toBeNull();
  });

  it('voltar do celular (popstate) fecha', () => {
    render(<RequireAuthProvider><Btn fn={vi.fn()} /></RequireAuthProvider>);
    fireEvent.click(screen.getByText('curtir'));
    act(() => { window.dispatchEvent(new PopStateEvent('popstate')); });
    expect(screen.queryByText('fake-login')).toBeNull();
  });
});
