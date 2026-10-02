// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TicketDetail } from './ticket-detail';

const ticket = {
  id: '5',
  uid: 'tk',
  type: 'support',
  title: 'Ajuda',
  description: '',
  status: 'open',
  createdBy: 'u1',
  subjectUserId: null,
  relatedUserId: null,
  payload: {},
  createdAt: '2026-09-29T10:00:00Z',
  updatedAt: '2026-09-29T10:00:00Z',
  resolvedAt: null,
  isSystem: false,
};

function stubFetch() {
  const fn = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url);
    if (!init?.method && u.startsWith('/api/resources/tickets/5')) {
      return new Response(JSON.stringify({ item: ticket }));
    }
    return new Response(JSON.stringify(init?.method ? { item: {} } : { items: [] }));
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('TicketDetail', () => {
  it('usuário vê o status, sem seletor', async () => {
    stubFetch();
    render(<TicketDetail ticketId="5" viewer={{ userId: 'u1', isStaff: false }} />);
    expect(await screen.findByText('Ajuda')).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('equipe muda status: PATCH no ticket e depois o registro no histórico', async () => {
    const fetchMock = stubFetch();
    render(<TicketDetail ticketId="5" viewer={{ userId: 'r1', isStaff: true }} />);
    fireEvent.change(await screen.findByRole('combobox'), { target: { value: 'resolved' } });

    await waitFor(() => {
      const writes = fetchMock.mock.calls.filter(([, init]) => init?.method);
      expect(writes.map(([url, init]) => `${init!.method} ${url}`)).toEqual([
        'PATCH /api/resources/tickets/5',
        'POST /api/resources/ticket_replies',
      ]);
      expect(JSON.parse(String(writes[1][1]!.body))).toEqual({
        ticketId: '5',
        kind: 'status_change',
        body: 'Status: Aberto → Resolvido',
      });
    });
  });
});
