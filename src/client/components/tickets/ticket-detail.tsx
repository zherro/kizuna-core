'use client';

import { useEffect, useState } from 'react';
import { cn } from '../../../lib/utils';
import { CopyButton } from './copy-button';
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

const STATUS_TONE: Record<TicketStatus, string> = {
  open: 'bg-amber-500/15 text-amber-700 ring-amber-500/30 dark:text-amber-300',
  in_progress: 'bg-sky-500/15 text-sky-700 ring-sky-500/30 dark:text-sky-300',
  resolved: 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300',
};

const jsonInit = (method: 'PATCH' | 'POST', body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

/**
 * Detalhe do chamado: cabeçalho enxuto (número, título, status, prazo) e a conversa em formato de
 * chat, com a descrição como primeira mensagem. A equipe muda o status: UPDATE no ticket e, em
 * seguida, uma resposta `status_change` em ticket_replies, que fica no histórico (duas escritas — o
 * banco não tem função para isso).
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

  const overdue =
    ticket.status !== 'resolved' && !!ticket.slaDueAt && Date.parse(ticket.slaDueAt) < Date.now();
  const openerLabel = ticket.isSystem ? 'Sistema' : (ticket.ownerEmail ?? 'Usuário');

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
              {formatTicketNumber(ticket.id)}
            </span>
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs font-medium ring-1',
                STATUS_TONE[ticket.status]
              )}
            >
              {TICKET_STATUS_LABEL[ticket.status]}
            </span>
            <span className="text-xs text-muted-foreground">
              {TICKET_TYPE_LABEL[ticket.type] ?? ticket.type}
            </span>
          </div>
          <CopyButton
            value={`${window.location.origin}${ticketPath(ticket.id)}`}
            label="Copiar link do chamado"
          />
        </div>

        <h1 className="mt-3 break-words text-xl font-bold leading-snug sm:text-2xl">
          {ticket.title}
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          {ticket.isSystem ? 'Aberto pelo sistema' : `Aberto por ${openerLabel}`} em{' '}
          {new Date(ticket.createdAt).toLocaleString('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'short',
          })}
        </p>

        {ticket.slaDueAt || viewer.isStaff ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm">
            {ticket.slaDueAt ? (
              <p>
                <span className="text-muted-foreground">Prazo da primeira resposta</span>{' '}
                <span className="font-medium">{formatSlaDate(ticket.slaDueAt)}</span>
                {overdue ? (
                  <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                    vencido
                  </span>
                ) : null}
              </p>
            ) : (
              <span />
            )}

            {viewer.isStaff ? (
              <label className="flex items-center gap-2">
                <span className="text-muted-foreground">Status</span>
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
            ) : null}
          </div>
        ) : null}

        {viewer.isStaff && ticket.type === 'contact' ? (
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-xl bg-muted/50 p-3 text-xs">
            <dt className="text-muted-foreground">Nome</dt>
            <dd>{ticket.contactName ?? '—'}</dd>
            <dt className="text-muted-foreground">E-mail</dt>
            <dd>{ticket.ownerEmail ?? '—'}</dd>
            <dt className="text-muted-foreground">Telefone</dt>
            <dd>{ticket.contactPhone ?? '—'}</dd>
          </dl>
        ) : null}

        {viewer.isStaff && ticket.type === 'account_recreated' ? (
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-xl bg-muted/50 p-3 text-xs">
            <dt className="text-muted-foreground">Login</dt>
            <dd>{String(ticket.payload.login ?? '')}</dd>
            <dt className="text-muted-foreground">Conta nova</dt>
            <dd className="break-all font-mono">{ticket.subjectUserId}</dd>
            <dt className="text-muted-foreground">Conta anterior</dt>
            <dd className="break-all font-mono">{ticket.relatedUserId}</dd>
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

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      </header>

      <TicketThread
        ticketId={ticketId}
        viewer={viewer}
        refreshKey={refreshKey}
        opening={
          ticket.description || ticket.imageIds?.length
            ? {
                body: ticket.description ?? "",
                imageIds: ticket.imageIds ?? [],
                createdAt: ticket.createdAt,
                author: ticket.isSystem ? 'Sistema' : viewer.isStaff ? 'Usuário' : 'Você',
                mine: !viewer.isStaff && !ticket.isSystem,
              }
            : null
        }
      />
    </div>
  );
}
