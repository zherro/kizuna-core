import type { ResourceConfig } from '../types/resource-config';

/**
 * `ResourceConfig`s do plugin `tickets` (plugins/tickets/0001_tickets.sql). A RLS decide quem vê e
 * escreve o quê (usuário: os seus; equipe `tickets.manage`: todos); estes configs só traduzem
 * campos. Comentários do usuário e respostas da equipe ficam em tabelas separadas (ver o SQL).
 * Tickets do sistema são abertos no servidor (service_role), nunca por esta rota.
 */
type RecordValue = Record<string, unknown>;

const STATUSES = ['open', 'in_progress', 'resolved'];
const REPLY_KINDS = ['reply', 'status_change'];

const nowIso = () => new Date().toISOString();
const text = (value: unknown) => String(value ?? '').trim();

const TICKETS: ResourceConfig = {
  schema: 'public',
  table: 'tickets',
  listRequiresAuth: true,
  returnRepresentation: true,
  select:
    'id,uid,type,title,description,status,created_by,subject_user_id,related_user_id,payload,created_at,updated_at,resolved_at',
  primaryKey: 'id',
  defaultOrder: 'created_at',
  searchableColumns: ['title', 'description'],
  // POST: title/description (o resto é default da tabela + RLS). PATCH: status (só staff, RLS).
  mapInput: (input) => {
    const out: RecordValue = {};
    if (input.title !== undefined) out.title = text(input.title);
    if (input.description !== undefined) out.description = text(input.description) || null;
    if (input.status !== undefined && STATUSES.includes(text(input.status))) {
      out.status = text(input.status);
      out.resolved_at = out.status === 'resolved' ? nowIso() : null;
      out.updated_at = nowIso();
    }
    return out;
  },
  mapOutput: (record) => ({
    id: String(record.id ?? ''),
    uid: record.uid ?? null,
    type: String(record.type ?? 'support'),
    title: String(record.title ?? ''),
    description: String(record.description ?? ''),
    status: String(record.status ?? 'open'),
    createdBy: record.created_by ?? null,
    subjectUserId: record.subject_user_id ?? null,
    relatedUserId: record.related_user_id ?? null,
    payload: (record.payload as RecordValue | null) ?? {},
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    resolvedAt: record.resolved_at ?? null,
    isSystem: record.created_by == null,
  }),
};

/**
 * Corpo de comentário/resposta. Criação (vem `ticketId`) grava só `ticket_id` + `body` — o banco
 * preenche `created_at`/`updated_at` (e o GRANT de INSERT nem inclui `updated_at`). Edição (sem
 * `ticketId`) carimba `updated_at`, que a tela usa para mostrar "editado".
 */
function mapMessageInput(input: RecordValue): RecordValue {
  const out: RecordValue = {};
  const creating = input.ticketId !== undefined;
  if (creating) out.ticket_id = Number(input.ticketId);
  if (input.body !== undefined) {
    out.body = text(input.body);
    if (!creating) out.updated_at = nowIso();
  }
  return out;
}

const mapMessageOutput = (record: RecordValue) => ({
  id: String(record.id ?? ''),
  ticketId: String(record.ticket_id ?? ''),
  authorId: record.author_id ?? null,
  body: String(record.body ?? ''),
  createdAt: record.created_at,
  updatedAt: record.updated_at,
});

/** Comentários do usuário. PATCH `{ body }` edita; `{ deleted: true }` apaga (lógico). */
const TICKET_COMMENTS: ResourceConfig = {
  schema: 'public',
  table: 'ticket_comments',
  listRequiresAuth: true,
  returnRepresentation: true,
  select: 'id,ticket_id,author_id,body,created_at,updated_at,deleted_at',
  primaryKey: 'id',
  defaultOrder: 'created_at',
  searchableColumns: [],
  maxPageSize: 500,
  mapInput: (input) => {
    const out = mapMessageInput(input);
    if (input.deleted === true) out.deleted_at = nowIso();
    return out;
  },
  mapOutput: (record) => ({ ...mapMessageOutput(record), deletedAt: record.deleted_at ?? null }),
};

/** Respostas da equipe e registros de troca de status (`kind: 'status_change'`). */
const TICKET_REPLIES: ResourceConfig = {
  schema: 'public',
  table: 'ticket_replies',
  listRequiresAuth: true,
  returnRepresentation: true,
  select: 'id,ticket_id,author_id,kind,body,created_at,updated_at',
  primaryKey: 'id',
  defaultOrder: 'created_at',
  searchableColumns: [],
  maxPageSize: 500,
  mapInput: (input) => {
    const out = mapMessageInput(input);
    if (REPLY_KINDS.includes(text(input.kind))) out.kind = text(input.kind);
    return out;
  },
  mapOutput: (record) => ({ ...mapMessageOutput(record), kind: String(record.kind ?? 'reply') }),
};

export const resourceTickets: Record<string, ResourceConfig> = {
  tickets: TICKETS,
  ticket_comments: TICKET_COMMENTS,
  ticket_replies: TICKET_REPLIES,
};
