/** Formas de saída dos recursos `tickets` / `ticket_comments` (screen-engine/resources/tickets.ts). */
export type TicketStatus = 'open' | 'in_progress' | 'resolved';

export type Ticket = {
  id: string;
  uid: string;
  type: string;
  title: string;
  description: string;
  status: TicketStatus;
  /** E-mail (login) de quem abriu — a chave que liga o chamado ao usuário dono. */
  ownerEmail: string | null;
  /** Só no contato público (type 'contact'): nome e telefone informados pelo visitante. */
  contactName: string | null;
  contactPhone: string | null;
  createdBy: string | null;
  subjectUserId: string | null;
  relatedUserId: string | null;
  payload: Record<string, unknown>;
  /** Até 3 imagens anexadas (ids de public.files). */
  imageIds: string[];
  /** Prazo da primeira resposta (dias úteis; ver ticket-sla.ts). */
  slaDueAt: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  isSystem: boolean;
};

/** Comentário do usuário (`ticket_comments`). */
export type TicketComment = {
  id: string;
  ticketId: string;
  authorId: string | null;
  imageIds: string[];
  body: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

/** Resposta da equipe ou registro de troca de status (`ticket_replies`). */
export type TicketReply = {
  id: string;
  ticketId: string;
  authorId: string | null;
  kind: 'reply' | 'status_change' | string;
  imageIds: string[];
  body: string;
  createdAt: string;
  updatedAt: string;
};

/** Item da conversa, na ordem do tempo. */
export type ThreadEntry =
  { source: 'comment'; item: TicketComment } | { source: 'reply'; item: TicketReply };

/** Quem está vendo: staff = root ou permissão `tickets.manage`. */
export type Viewer = { userId: string; isStaff: boolean };

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  open: 'Aberto',
  in_progress: 'Em andamento',
  resolved: 'Resolvido',
};

export const TICKET_TYPE_LABEL: Record<string, string> = {
  support: 'Suporte',
  account_recreated: 'Conta recriada',
  contact: 'Contato',
};
