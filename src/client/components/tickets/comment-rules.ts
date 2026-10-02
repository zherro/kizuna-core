import type { ThreadEntry, TicketComment, TicketReply, Viewer } from './types';

/**
 * Espelha a RLS de `ticket_comments` / `ticket_replies` (plugins/tickets/0001_tickets.sql) para a
 * tela só oferecer o que o banco vai aceitar.
 */

/** O autor edita/apaga o próprio comentário, não apagado, enquanto a equipe não respondeu depois. */
export function canModifyComment(
  comment: TicketComment,
  replies: TicketReply[],
  viewer: Viewer
): boolean {
  if (viewer.isStaff || comment.authorId !== viewer.userId || comment.deletedAt) return false;
  const writtenAt = Date.parse(comment.createdAt);
  return !replies.some((reply) => Date.parse(reply.createdAt) > writtenAt);
}

/** A equipe edita as próprias respostas (registros de status não). */
export function canEditReply(reply: TicketReply, viewer: Viewer): boolean {
  return viewer.isStaff && reply.authorId === viewer.userId && reply.kind === 'reply';
}

/**
 * Conversa em ordem do tempo. Comentários apagados só aparecem para a equipe — o autor ainda
 * recebe os próprios apagados da API (exigência da RLS no soft delete), então a tela filtra.
 */
export function buildThread(
  comments: TicketComment[],
  replies: TicketReply[],
  viewer: Viewer
): ThreadEntry[] {
  const entries: ThreadEntry[] = [
    ...comments
      .filter((comment) => viewer.isStaff || !comment.deletedAt)
      .map((item) => ({ source: 'comment' as const, item })),
    ...replies.map((item) => ({ source: 'reply' as const, item })),
  ];
  return entries.sort((a, b) => Date.parse(a.item.createdAt) - Date.parse(b.item.createdAt));
}
