// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TicketThread } from './ticket-thread';

const comments = [
  {
    id: '1',
    ticketId: '9',
    authorId: 'u1',
    body: 'Meu texto',
    createdAt: '2026-09-29T10:00:00Z',
    updatedAt: '2026-09-29T10:00:00Z',
    deletedAt: null,
  },
  {
    id: '2',
    ticketId: '9',
    authorId: 'u1',
    body: 'Texto apagado',
    createdAt: '2026-09-29T10:05:00Z',
    updatedAt: '2026-09-29T10:05:00Z',
    deletedAt: '2026-09-29T10:06:00Z',
  },
];

function stubFetch(replies: unknown[] = []) {
  const fn = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method) return new Response(JSON.stringify({ item: {} }), { status: 200 });
    const items = String(url).startsWith('/api/resources/ticket_replies') ? replies : comments;
    return new Response(JSON.stringify({ items }), { status: 200 });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

const writesOf = (fn: ReturnType<typeof stubFetch>) =>
  fn.mock.calls.filter(([, init]) => init?.method);

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('TicketThread', () => {
  it('usuário: esconde os apagados e apaga o próprio (PATCH deleted)', async () => {
    const fetchMock = stubFetch();
    render(<TicketThread ticketId="9" viewer={{ userId: 'u1', isStaff: false }} />);

    expect(await screen.findByText('Meu texto')).toBeTruthy();
    expect(screen.queryByText('Texto apagado')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Apagar' }));
    await waitFor(() =>
      expect(writesOf(fetchMock)[0]).toEqual([
        '/api/resources/ticket_comments/1',
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ deleted: true }) }),
      ])
    );
  });

  it('usuário: depois da resposta da equipe, o comentário anterior fica travado', async () => {
    stubFetch([
      {
        id: '7',
        ticketId: '9',
        authorId: 'staff',
        kind: 'reply',
        body: 'Resposta',
        createdAt: '2026-09-29T11:00:00Z',
        updatedAt: '2026-09-29T11:00:00Z',
      },
    ]);
    render(<TicketThread ticketId="9" viewer={{ userId: 'u1', isStaff: false }} />);
    expect(await screen.findByText('Resposta')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Apagar' })).toBeNull();
  });

  it('equipe: vê o apagado marcado e responde em ticket_replies', async () => {
    const fetchMock = stubFetch();
    render(<TicketThread ticketId="9" viewer={{ userId: 'staff', isStaff: true }} />);

    expect(await screen.findByText('Comentário excluído')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('Responder como equipe...'), {
      target: { value: 'Oi' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Responder' }));

    await waitFor(() =>
      expect(writesOf(fetchMock)[0]).toEqual([
        '/api/resources/ticket_replies',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ ticketId: '9', body: 'Oi', kind: 'reply' }),
        }),
      ])
    );
  });

  it('usuário comenta em ticket_comments', async () => {
    const fetchMock = stubFetch();
    render(<TicketThread ticketId="9" viewer={{ userId: 'u1', isStaff: false }} />);
    await screen.findByText('Meu texto');
    fireEvent.change(screen.getByPlaceholderText('Escreva um comentário...'), {
      target: { value: 'Mais info' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Comentar' }));
    await waitFor(() =>
      expect(writesOf(fetchMock)[0]).toEqual([
        '/api/resources/ticket_comments',
        expect.objectContaining({ body: JSON.stringify({ ticketId: '9', body: 'Mais info' }) }),
      ])
    );
  });
});
