import { describe, expect, it } from 'vitest';
import { buildThread, canEditReply, canModifyComment } from './comment-rules';
import type { TicketComment, TicketReply } from './types';

const comment = (over: Partial<TicketComment> = {}): TicketComment => ({
  id: 'c1',
  ticketId: '1',
  authorId: 'u1',
  body: 'x',
  createdAt: '2026-09-29T10:00:00Z',
  updatedAt: '2026-09-29T10:00:00Z',
  deletedAt: null,
  ...over,
});

const reply = (over: Partial<TicketReply> = {}): TicketReply => ({
  id: 'r1',
  ticketId: '1',
  authorId: 'staff',
  kind: 'reply',
  body: 'y',
  createdAt: '2026-09-29T11:00:00Z',
  updatedAt: '2026-09-29T11:00:00Z',
  ...over,
});

const user = { userId: 'u1', isStaff: false };
const staff = { userId: 'staff', isStaff: true };

describe('canModifyComment', () => {
  it('autor mexe no próprio enquanto a equipe não respondeu depois', () => {
    expect(canModifyComment(comment(), [], user)).toBe(true);
    expect(canModifyComment(comment(), [reply()], user)).toBe(false);
  });

  it('resposta ANTES do comentário não trava', () => {
    expect(canModifyComment(comment(), [reply({ createdAt: '2026-09-29T09:00:00Z' })], user)).toBe(
      true
    );
  });

  it('não mexe em comentário alheio, apagado, nem sendo equipe', () => {
    expect(canModifyComment(comment({ authorId: 'outro' }), [], user)).toBe(false);
    expect(canModifyComment(comment({ deletedAt: '2026-09-29T10:30:00Z' }), [], user)).toBe(false);
    expect(canModifyComment(comment({ authorId: 'staff' }), [], staff)).toBe(false);
  });
});

describe('canEditReply', () => {
  it('equipe edita a própria resposta, não registros de status nem de outros', () => {
    expect(canEditReply(reply(), staff)).toBe(true);
    expect(canEditReply(reply({ kind: 'status_change' }), staff)).toBe(false);
    expect(canEditReply(reply({ authorId: 'outro' }), staff)).toBe(false);
    expect(canEditReply(reply({ authorId: 'u1' }), user)).toBe(false);
  });
});

describe('buildThread', () => {
  const deleted = comment({ id: 'c2', createdAt: '2026-09-29T12:00:00Z', deletedAt: 'x' });

  it('junta comentários e respostas em ordem do tempo', () => {
    const thread = buildThread([comment()], [reply()], user);
    expect(thread.map((e) => `${e.source}:${e.item.id}`)).toEqual(['comment:c1', 'reply:r1']);
  });

  it('apagados: só a equipe vê', () => {
    expect(buildThread([comment(), deleted], [], user)).toHaveLength(1);
    expect(buildThread([comment(), deleted], [], staff)).toHaveLength(2);
  });
});
