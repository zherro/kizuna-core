import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { resourceTickets } from './tickets';

const NOW = '2026-09-29T12:00:00.000Z';

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
});

afterAll(() => {
  vi.useRealTimers();
});

const tickets = resourceTickets.tickets;
const comments = resourceTickets.ticket_comments;

describe('resourceTickets', () => {
  it('ticket: POST leva só título e descrição — tipo e autor vêm de default + RLS', () => {
    expect(
      tickets.mapInput!({
        title: ' Ajuda ',
        description: '  ',
        type: 'account_recreated',
        createdBy: 'outro',
      })
    ).toEqual({ title: 'Ajuda', description: null });
  });

  it('ticket: PATCH de status carimba resolved_at e updated_at; status inválido é ignorado', () => {
    expect(tickets.mapInput!({ status: 'resolved' })).toEqual({
      status: 'resolved',
      resolved_at: NOW,
      updated_at: NOW,
    });
    expect(tickets.mapInput!({ status: 'open' })).toEqual({
      status: 'open',
      resolved_at: null,
      updated_at: NOW,
    });
    expect(tickets.mapInput!({ status: 'xyz' })).toEqual({});
  });

  it('ticket: saída em camelCase e marca ticket do sistema', () => {
    expect(
      tickets.mapOutput!({ id: 1, created_by: null, type: 'account_recreated', status: 'open' })
    ).toMatchObject({ id: '1', createdBy: null, isSystem: true, type: 'account_recreated' });
  });

  it('comentário: criar não carimba updated_at (senão tudo nasce "editado")', () => {
    expect(comments.mapInput!({ ticketId: '7', body: ' oi ', kind: 'status_change' })).toEqual({
      ticket_id: 7,
      body: 'oi',
    });
  });

  it('comentário: editar carimba updated_at; apagar é lógico', () => {
    expect(comments.mapInput!({ body: 'novo' })).toEqual({ body: 'novo', updated_at: NOW });
    expect(comments.mapInput!({ deleted: true })).toEqual({ deleted_at: NOW });
  });

  it('resposta da equipe: kind reply/status_change; kind inválido é ignorado', () => {
    const replies = resourceTickets.ticket_replies;
    expect(
      replies.mapInput!({ ticketId: '7', body: 'Status: A → B', kind: 'status_change' })
    ).toEqual({ ticket_id: 7, body: 'Status: A → B', kind: 'status_change' });
    expect(replies.mapInput!({ ticketId: '7', body: 'oi', kind: 'qualquer' })).toEqual({
      ticket_id: 7,
      body: 'oi',
    });
    expect(replies.mapOutput!({ id: 3, ticket_id: 7, kind: 'reply' })).toMatchObject({
      id: '3',
      ticketId: '7',
      kind: 'reply',
    });
  });
});
