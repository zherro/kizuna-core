// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('./ticket-image-picker', () => ({
  TicketImagePicker: ({ onChange }: { onChange: (ids: string[]) => void }) => (
    <button type="button" onClick={() => onChange(['img-1', 'img-2'])}>
      anexar
    </button>
  ),
}));
import { TicketCreateForm } from './ticket-create-form';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const created = (id: string) =>
  vi.fn(
    async () =>
      new Response(JSON.stringify({ item: { id, slaDueAt: '2026-10-07T15:00:00Z' } }), {
        status: 201,
      })
  );

function pickSubject(label: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Assunto' }));
  fireEvent.click(screen.getByRole('option', { name: label }));
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Abrir chamado' }));

describe('TicketCreateForm (logado)', () => {
  it('não pede nome, e-mail nem telefone', () => {
    render(<TicketCreateForm />);
    expect(screen.queryByLabelText('Nome')).toBeNull();
    expect(screen.queryByLabelText('E-mail')).toBeNull();
    expect(screen.queryByLabelText('Telefone')).toBeNull();
  });

  it('assunto comum + imagens → cria e mostra número e link compartilhável', async () => {
    const fetchMock = created('42');
    vi.stubGlobal('fetch', fetchMock);
    render(<TicketCreateForm />);

    pickSubject('Problema com meu anúncio');
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Detalhes' } });
    fireEvent.click(screen.getByRole('button', { name: 'anexar' }));
    submit();

    expect((await screen.findByTestId('ticket-number')).textContent).toBe('#000042');
    expect(screen.getByTestId('ticket-sla').textContent).toMatch(/Previsão da primeira resposta/);
    expect(
      (screen.getByLabelText('Link do chamado') as HTMLInputElement).value.endsWith(
        '/painel/chamados/42'
      )
    ).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/resources/tickets',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          title: 'Problema com meu anúncio',
          description: 'Detalhes',
          imageIds: ['img-1', 'img-2'],
        }),
      })
    );
  });

  it('"Outros" abre o campo livre e usa o texto como assunto', async () => {
    const fetchMock = created('5');
    vi.stubGlobal('fetch', fetchMock);
    render(<TicketCreateForm />);

    pickSubject('Outros');
    fireEvent.change(screen.getByLabelText('Qual é o assunto?'), {
      target: { value: 'Quero anunciar um evento' },
    });
    submit();

    await screen.findByTestId('ticket-number');
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body)).title).toBe('Quero anunciar um evento');
  });

  it('copia o número do chamado', async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    vi.stubGlobal('fetch', created('7'));
    render(<TicketCreateForm />);
    submit();

    fireEvent.click(await screen.findByRole('button', { name: 'Copiar número do chamado' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('#000007'));
  });

  it('erro da API → mensagem e não mostra o número', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 400 }))
    );
    render(<TicketCreateForm />);
    pickSubject('Outros');
    fireEvent.change(screen.getByLabelText('Qual é o assunto?'), { target: { value: 'Oi' } });
    submit();
    expect(await screen.findByText(/Não foi possível abrir o chamado/)).toBeTruthy();
    expect(screen.queryByTestId('ticket-number')).toBeNull();
  });
});

describe('TicketCreateForm (visitante)', () => {
  it('pede nome, e-mail e telefone e envia para /api/contact (sem imagens)', async () => {
    const fetchMock = created('9');
    vi.stubGlobal('fetch', fetchMock);
    render(<TicketCreateForm authenticated={false} />);

    expect(screen.queryByRole('button', { name: 'anexar' })).toBeNull();
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Maria' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'maria@example.com' } });
    fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '65 99999-0000' } });
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Oi' } });
    submit();

    await screen.findByTestId('ticket-number');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/contact',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          title: 'Dúvida sobre a plataforma',
          description: 'Oi',
          name: 'Maria',
          email: 'maria@example.com',
          phone: '65 99999-0000',
          website: '',
          captchaToken: null,
        }),
      })
    );
    expect(screen.getByText(/maria@example.com/)).toBeTruthy();
  });

  it('mostra a mensagem de erro devolvida pela rota', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ message: 'Informe um e-mail válido.' }), { status: 400 })
      )
    );
    render(<TicketCreateForm authenticated={false} />);
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Maria' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'x@y.z' } });
    submit();
    expect(await screen.findByText('Informe um e-mail válido.')).toBeTruthy();
  });
});
