'use client';

import { useEffect, useState } from 'react';
import { CopyButton } from './copy-button';
import { TicketAttachments } from './ticket-attachments';
import { formatTicketNumber, ticketPath } from './ticket-number';
import { formatSlaDate } from './ticket-sla';
import { TicketThread } from './ticket-thread';
import {
  TICKET_STATUS_LABEL,
  TICKET_TYPE_LABEL,
  type Ticket,
  type TicketStatus,
  type Viewer,
} from './types';

const STATUSES = Object.keys(TICKET_STATUS_LABEL) as TicketStatus[];

const jsonInit = (method: 'PATCH' | 'POST', body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

/**
 * Detalhe do chamado. A equipe muda o status: UPDATE no ticket e, em seguida, uma resposta
 * `status_change` em ticket_replies, que fica no histórico (duas escritas — o banco não tem função
 * para isso).
 */
export function TicketDetail({ ticketId, viewer }: { ticketId: string; viewer: Viewer }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/resources/tickets/${ticketId}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data) => setTicket(data.item as Ticket))
      .catch(() => setError('Chamado não encontrado.'));
  }, [ticketId]);

  async function changeStatus(next: TicketStatus) {
    if (!ticket || next === ticket.status) return;
    setError('');
    const res = await fetch(
      `/api/resources/tickets/${ticketId}`,
      jsonInit('PATCH', { status: next })
    );
    if (!res.ok) {
      setError('Não foi possível mudar o status.');
      return;
    }
    await fetch(
      '/api/resources/ticket_replies',
      jsonInit('POST', {
        ticketId,
        kind: 'status_change',
        body: `Status: ${TICKET_STATUS_LABEL[ticket.status]} → ${TICKET_STATUS_LABEL[next]}`,
      })
    );
    setTicket({ ...ticket, status: next });
    setRefreshKey((key) => key + 1);
  }

  if (!ticket) {
    return (
      <p className={error ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>
        {error || 'Carregando...'}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold">
            <span className="mr-2 font-mono text-muted-foreground">{formatTicketNumber(ticket.id)}</span>
            {ticket.title}
          </h1>
          <CopyButton
            value={`${window.location.origin}${ticketPath(ticket.id)}`}
            label="Copiar link do chamado"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {TICKET_TYPE_LABEL[ticket.type] ?? ticket.type} ·{' '}
          {ticket.isSystem
            ? 'aberto pelo sistema'
            : `aberto por ${ticket.ownerEmail ?? 'usuário'}`}{' '}
          ·{' '}
          {new Date(ticket.createdAt).toLocaleString('pt-BR')}
        </p>

        {ticket.slaDueAt ? (
          <p className="text-sm">
            <span className="font-medium">Prazo da primeira resposta:</span>{' '}
            {formatSlaDate(ticket.slaDueAt)}
            {ticket.status !== 'resolved' && Date.parse(ticket.slaDueAt) < Date.now() ? (
              <span className="ml-2 font-medium text-destructive">vencido</span>
            ) : null}
          </p>
        ) : null}

        {viewer.isStaff ? (
          <label className="flex items-center gap-2 text-sm">
            <span className="font-medium">Status</span>
            <select
              value={ticket.status}
              onChange={(e) => changeStatus(e.target.value as TicketStatus)}
              className="rounded-md border border-input bg-background px-2 py-1 text-sm"
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {TICKET_STATUS_LABEL[status]}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="text-sm">
            <span className="font-medium">Status:</span> {TICKET_STATUS_LABEL[ticket.status]}
          </p>
        )}

        {ticket.description ? (
          <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
        ) : null}
        <TicketAttachments imageIds={ticket.imageIds} />

        {viewer.isStaff && ticket.type === 'contact' ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-xl border border-border p-3 text-xs">
            <dt className="text-muted-foreground">Nome</dt>
            <dd>{ticket.contactName ?? '—'}</dd>
            <dt className="text-muted-foreground">E-mail</dt>
            <dd>{ticket.ownerEmail ?? '—'}</dd>
            <dt className="text-muted-foreground">Telefone</dt>
            <dd>{ticket.contactPhone ?? '—'}</dd>
          </dl>
        ) : null}

        {viewer.isStaff && ticket.type === 'account_recreated' ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-xl border border-border p-3 text-xs">
            <dt className="text-muted-foreground">Login</dt>
            <dd>{String(ticket.payload.login ?? '')}</dd>
            <dt className="text-muted-foreground">Conta nova</dt>
            <dd className="font-mono">{ticket.subjectUserId}</dd>
            <dt className="text-muted-foreground">Conta anterior</dt>
            <dd className="font-mono">{ticket.relatedUserId}</dd>
            <dt className="text-muted-foreground">Excluída em</dt>
            <dd>
              {ticket.payload.deletedAt
                ? new Date(String(ticket.payload.deletedAt)).toLocaleString('pt-BR')
                : '—'}
            </dd>
            <dt className="text-muted-foreground">Exclusões desse e-mail</dt>
            <dd>{String(ticket.payload.previousDeletions ?? '—')}</dd>
          </dl>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </header>

      <TicketThread ticketId={ticketId} viewer={viewer} refreshKey={refreshKey} />
    </div>
  );
}
