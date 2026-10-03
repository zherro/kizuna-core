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
  it('ticket: POST leva título, descrição e SLA — tipo e autor vêm de default + RLS', () => {
    const out = tickets.mapInput!({
    title: ' Ajuda ',
    description: '  ',
    type: 'account_recreated',
    createdBy: 'outro',
    });
    expect(out).toEqual({
      title: 'Ajuda',
      description: null,
      sla_due_at: expect.any(String),
    });
    expect(Date.parse(String(out.sla_due_at))).toBeGreaterThan(Date.now());
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

  it('anexos: no máximo 3 ids válidos e sem repetição', () => {
    const ids = [
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
      '33333333-3333-4333-8333-333333333333',
      '44444444-4444-4444-8444-444444444444',
    ];
    expect(
      resourceTickets.tickets.mapInput!({ title: 'Oi!', imageIds: [ids[0], ids[0], 'x', ...ids] })
    ).toMatchObject({ image_ids: [ids[0], ids[1], ids[2]] });
    expect(
      resourceTickets.ticket_comments.mapInput!({ ticketId: '7', body: 'oi', imageIds: ids })
    ).toMatchObject({ image_ids: [ids[0], ids[1], ids[2]] });
  });

  it('ticket: e-mail dono e contato na saída; contato público não é "do sistema"', () => {
    const base = { id: 1, title: 'x', owner_email: 'maria@example.com', image_ids: ['a'] };
    expect(
      resourceTickets.tickets.mapOutput!({ ...base, type: 'contact', created_by: null, contact_name: 'Maria' })
    ).toMatchObject({
      ownerEmail: 'maria@example.com',
      contactName: 'Maria',
      imageIds: ['a'],
      isSystem: false,
    });
    expect(
      resourceTickets.tickets.mapOutput!({ ...base, type: 'account_recreated', created_by: null })
    ).toMatchObject({ isSystem: true });
  });
});
