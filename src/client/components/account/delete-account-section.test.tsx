// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DeleteAccountSection } from './delete-account-section';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubFetch(status: number, body: unknown) {
  const fn = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

function confirmWith(email: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Excluir minha conta' }));
  fireEvent.change(screen.getByLabelText('Digite seu e-mail para confirmar'), {
    target: { value: email },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Excluir definitivamente' }));
}

describe('DeleteAccountSection', () => {
  it('sucesso → envia o e-mail e chama onDeleted', async () => {
    const fetchMock = stubFetch(200, { ok: true });
    const onDeleted = vi.fn();
    render(<DeleteAccountSection onDeleted={onDeleted} />);

    confirmWith(' a@b.com ');

    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/account/delete',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ email: 'a@b.com' }) })
    );
  });

  it('login antigo → oferece entrar de novo (sai e volta para Minha conta)', async () => {
    stubFetch(401, { code: 'reauth_required' });
    const onReauth = vi.fn();
    render(<DeleteAccountSection onDeleted={vi.fn()} onReauth={onReauth} />);

    confirmWith('a@b.com');
    fireEvent.click(await screen.findByRole('button', { name: 'Entrar novamente' }));

    expect(onReauth).toHaveBeenCalled();
  });

  it('e-mail errado → mensagem clara', async () => {
    stubFetch(400, { code: 'email_mismatch' });
    render(<DeleteAccountSection onDeleted={vi.fn()} />);
    confirmWith('x@y.com');
    expect(await screen.findByText('O e-mail não confere com o da sua conta.')).toBeTruthy();
  });
});
