// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
import { TicketCreateForm } from './ticket-create-form';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  push.mockClear();
});

function fill(title: string, description: string) {
  fireEvent.change(screen.getByLabelText('Assunto'), { target: { value: title } });
  fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: description } });
  fireEvent.click(screen.getByRole('button', { name: 'Abrir chamado' }));
}

describe('TicketCreateForm', () => {
  it('cria o chamado e abre o detalhe', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ item: { id: '42' } }), { status: 201 })
    );
    vi.stubGlobal('fetch', fetchMock);
    render(<TicketCreateForm />);

    fill('Não consigo publicar', 'Detalhes');

    await waitFor(() => expect(push).toHaveBeenCalledWith('/painel/chamados/42'));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/resources/tickets',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: 'Não consigo publicar', description: 'Detalhes' }),
      })
    );
  });

  it('erro da API → mensagem e não navega', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 400 }))
    );
    render(<TicketCreateForm />);
    fill('Oi!', '');
    expect(await screen.findByText(/Não foi possível abrir o chamado/)).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });
});
