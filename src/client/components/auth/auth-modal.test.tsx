// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';

vi.mock('./login-form', () => ({
  LoginForm: (p: { onSuccess: (u: unknown) => void }) => (
    <div>
      <button onClick={() => p.onSuccess({ user_id: 'u1' })}>fake-login</button>
      <a href="/esqueci-senha">Esqueci minha senha</a>
    </div>
  ),
}));
vi.mock('./register-form', () => ({ RegisterForm: () => <div>fake-register</div> }));

import { AuthModal } from './auth-modal';

let back: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  window.history.replaceState(null, '');
  // não navega de verdade: o teste decide quando o popstate chega
  back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
});
afterEach(() => { cleanup(); back.mockRestore(); });

const popstate = () => act(() => { window.dispatchEvent(new PopStateEvent('popstate')); });

describe('AuthModal (histórico)', () => {
  it('abrir empilha uma entrada própria', () => {
    render(<AuthModal open onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(window.history.state).toMatchObject({ kizunaAuthModal: true });
  });

  it('X fecha e remove a entrada (history.back)', () => {
    const onClose = vi.fn();
    render(<AuthModal open onClose={onClose} onSuccess={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Fechar'));
    expect(onClose).toHaveBeenCalledOnce();
    expect(back).toHaveBeenCalledOnce();
  });

  it('Esc e clique no overlay também chamam back', () => {
    const onClose = vi.fn();
    render(<AuthModal open onClose={onClose} onSuccess={vi.fn()} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(back).toHaveBeenCalledTimes(1);
    fireEvent.mouseDown(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('voltar do celular (popstate) fecha sem chamar back', () => {
    const onClose = vi.fn();
    render(<AuthModal open onClose={onClose} onSuccess={vi.fn()} />);
    popstate();
    expect(onClose).toHaveBeenCalledOnce();
    expect(back).not.toHaveBeenCalled();
  });

  it('desmontar sem fechar explícito (navegação por link) não chama back', () => {
    const { unmount } = render(<AuthModal open onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(screen.getByText('Esqueci minha senha').getAttribute('href')).toBe('/esqueci-senha');
    unmount();
    expect(back).not.toHaveBeenCalled();
  });

  it('fechar pelo pai (open=false) não chama back', () => {
    const { rerender } = render(<AuthModal open onClose={vi.fn()} onSuccess={vi.fn()} />);
    rerender(<AuthModal open={false} onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(back).not.toHaveBeenCalled();
  });

  it('sucesso: back e só depois do popstate chama onSuccess (não corre com a navegação da ação)', () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    render(<AuthModal open onClose={onClose} onSuccess={onSuccess} />);
    fireEvent.click(screen.getByText('fake-login'));
    expect(back).toHaveBeenCalledOnce();
    expect(onSuccess).not.toHaveBeenCalled();
    popstate();
    expect(onSuccess).toHaveBeenCalledWith({ user_id: 'u1' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('sucesso sem a entrada no topo chama onSuccess direto, sem back', () => {
    const onSuccess = vi.fn();
    render(<AuthModal open onClose={vi.fn()} onSuccess={onSuccess} />);
    window.history.replaceState(null, '');
    fireEvent.click(screen.getByText('fake-login'));
    expect(back).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledOnce();
  });
});
