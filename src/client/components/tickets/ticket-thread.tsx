'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { buildThread, canEditReply, canModifyComment } from './comment-rules';
import type { ThreadEntry, TicketComment, TicketReply, Viewer } from './types';

const COMMENTS = '/api/resources/ticket_comments';
const REPLIES = '/api/resources/ticket_replies';

type Props = {
  ticketId: string;
  viewer: Viewer;
  /** Muda para recarregar de fora (ex.: depois de uma troca de status). */
  refreshKey?: number;
};

type Editing = { source: ThreadEntry['source']; id: string; body: string };

const formatDate = (iso: string) => new Date(iso).toLocaleString('pt-BR');
const baseOf = (source: ThreadEntry['source']) => (source === 'comment' ? COMMENTS : REPLIES);

async function fetchList<T>(base: string, ticketId: string): Promise<T[]> {
  const query = new URLSearchParams({
    'filter.ticket_id': ticketId,
    orderBy: 'created_at',
    pageSize: '500',
  });
  const res = await fetch(`${base}?${query}`, { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  return Array.isArray(data.items) ? data.items : [];
}

function authorLabel(entry: ThreadEntry, viewer: Viewer): string {
  if (entry.source === 'reply') return 'Equipe';
  return entry.item.authorId === viewer.userId ? 'Você' : 'Usuário';
}

/**
 * Conversa de um chamado: comentários do usuário (`ticket_comments`) + respostas da equipe
 * (`ticket_replies`), em ordem do tempo. Quem escreve onde e o que pode ser editado/apagado vem de
 * comment-rules (espelho da RLS).
 */
export function TicketThread({ ticketId, viewer, refreshKey = 0 }: Props) {
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<Editing | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [nextComments, nextReplies] = await Promise.all([
      fetchList<TicketComment>(COMMENTS, ticketId),
      fetchList<TicketReply>(REPLIES, ticketId),
    ]);
    setComments(nextComments);
    setReplies(nextReplies);
  }, [ticketId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function write(url: string, method: 'POST' | 'PATCH', body: unknown): Promise<boolean> {
    setError('');
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) setError('Não foi possível salvar. Atualize a página e tente de novo.');
    await load();
    return res.ok;
  }

  async function send() {
    const body = draft.trim();
    if (!body) return;
    // A equipe responde em ticket_replies; o usuário comenta em ticket_comments.
    const saved = viewer.isStaff
      ? await write(REPLIES, 'POST', { ticketId, body, kind: 'reply' })
      : await write(COMMENTS, 'POST', { ticketId, body });
    if (saved) setDraft('');
  }

  async function saveEdit() {
    if (!editing) return;
    const saved = await write(`${baseOf(editing.source)}/${editing.id}`, 'PATCH', {
      body: editing.body,
    });
    if (saved) setEditing(null);
  }

  return (
    <section className="space-y-4">
      <ul className="space-y-3">
        {buildThread(comments, replies, viewer).map((entry) => {
          const { item, source } = entry;
          const deletedAt = source === 'comment' ? entry.item.deletedAt : null;
          const isStatusChange = source === 'reply' && entry.item.kind === 'status_change';
          const isEditing = editing?.source === source && editing.id === item.id;
          const edited = item.updatedAt !== item.createdAt && !deletedAt;
          const canEdit =
            source === 'comment'
              ? canModifyComment(entry.item, replies, viewer)
              : canEditReply(entry.item, viewer);

          return (
            <li
              key={`${source}-${item.id}`}
              className={
                source === 'reply'
                  ? 'rounded-xl border border-primary/30 bg-primary/5 p-4'
                  : 'rounded-xl border border-border bg-card p-4'
              }
            >
              <p className="mb-1 text-xs text-muted-foreground">
                {authorLabel(entry, viewer)} · {formatDate(item.createdAt)}
                {edited ? ' · editado' : ''}
              </p>

              {deletedAt ? (
                <div className="text-sm text-muted-foreground">
                  <p className="italic">Comentário excluído</p>
                  <p className="mt-1 line-through">{item.body}</p>
                </div>
              ) : isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editing.body}
                    onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit} disabled={!editing.body.trim()}>
                      Salvar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <p
                  className={
                    isStatusChange
                      ? 'text-sm italic text-muted-foreground'
                      : 'whitespace-pre-wrap text-sm'
                  }
                >
                  {item.body}
                </p>
              )}

              {canEdit && !isEditing ? (
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing({ source, id: item.id, body: item.body })}
                  >
                    Editar
                  </Button>
                  {source === 'comment' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => write(`${COMMENTS}/${item.id}`, 'PATCH', { deleted: true })}
                    >
                      Apagar
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="space-y-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={viewer.isStaff ? 'Responder como equipe...' : 'Escreva um comentário...'}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button onClick={send} disabled={!draft.trim()}>
          {viewer.isStaff ? 'Responder' : 'Comentar'}
        </Button>
      </div>
    </section>
  );
}
