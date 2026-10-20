'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { cn } from '../../../lib/utils';
import { Button } from '../ui/button';
import { MarkdownEditor } from '../ui/markdown-editor';
import { Textarea } from '../ui/textarea';
import { TicketMarkdown } from './ticket-markdown';
import { TicketAttachments } from './ticket-attachments';
import { TicketImagePicker } from './ticket-image-picker';
import { buildThread, canEditReply, canModifyComment } from './comment-rules';
import type { ThreadEntry, TicketComment, TicketReply, Viewer } from './types';

const COMMENTS = '/api/resources/ticket_comments';
const REPLIES = '/api/resources/ticket_replies';

/** Mensagem de abertura (a descrição do chamado), mostrada como a primeira bolha da conversa. */
export type TicketOpening = {
  body: string;
  imageIds: string[];
  createdAt: string;
  author: string;
  mine: boolean;
};

type Props = {
  ticketId: string;
  opening?: TicketOpening | null;
  viewer: Viewer;
  /** Muda para recarregar de fora (ex.: depois de uma troca de status). */
  refreshKey?: number;
};

type Editing = { source: ThreadEntry['source']; id: string; body: string };

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
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
 * Conversa de um chamado, em formato de chat: comentários do usuário (`ticket_comments`) + respostas
 * da equipe (`ticket_replies`), em ordem do tempo. Quem escreve onde e o que pode ser editado/apagado
 * vem de comment-rules (espelho da RLS).
 */
export function TicketThread({ ticketId, opening = null, viewer, refreshKey = 0 }: Props) {
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [draft, setDraft] = useState('');
  const [draftImageIds, setDraftImageIds] = useState<string[]>([]);
  const [pickerKey, setPickerKey] = useState(0);
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
      ? await write(REPLIES, 'POST', { ticketId, body, kind: 'reply', imageIds: draftImageIds })
      : await write(COMMENTS, 'POST', { ticketId, body, imageIds: draftImageIds });
    if (saved) {
      setDraft('');
      setDraftImageIds([]);
      setPickerKey((key) => key + 1);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    const saved = await write(`${baseOf(editing.source)}/${editing.id}`, 'PATCH', {
      body: editing.body,
    });
    if (saved) setEditing(null);
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <ul className="flex flex-col gap-4 bg-muted/30 p-4 sm:p-6">
        {opening ? (
          <Bubble
            mine={opening.mine}
            staff={false}
            author={opening.author}
            time={formatDate(opening.createdAt)}
          >
            <TicketMarkdown>{opening.body}</TicketMarkdown>
            <TicketAttachments imageIds={opening.imageIds} />
          </Bubble>
        ) : null}

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

          if (isStatusChange) {
            return (
              <li
                key={`${source}-${item.id}`}
                className="flex items-center gap-3 text-xs text-muted-foreground"
              >
                <span className="h-px flex-1 bg-border" />
                <span className="rounded-full bg-background px-3 py-1 ring-1 ring-border">
                  {item.body} · {formatDate(item.createdAt)}
                </span>
                <span className="h-px flex-1 bg-border" />
              </li>
            );
          }

          const mine = viewer.isStaff ? source === 'reply' : entry.item.authorId === viewer.userId;

          return (
            <Bubble
              key={`${source}-${item.id}`}
              mine={mine}
              staff={source === 'reply'}
              author={authorLabel(entry, viewer)}
              time={`${formatDate(item.createdAt)}${edited ? ' · editado' : ''}`}
            >
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
                <TicketMarkdown>{item.body}</TicketMarkdown>
              )}

              {deletedAt ? null : <TicketAttachments imageIds={item.imageIds} />}

              {canEdit && !isEditing ? (
                <div className="-mb-1 mt-1 flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => setEditing({ source, id: item.id, body: item.body })}
                  >
                    Editar
                  </Button>
                  {source === 'comment' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => write(`${COMMENTS}/${item.id}`, 'PATCH', { deleted: true })}
                    >
                      Apagar
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </Bubble>
          );
        })}
      </ul>

      <div className="space-y-2 border-t border-border bg-card p-3 sm:p-4">
        <MarkdownEditor
          value={draft}
          onChange={setDraft}
          height={140}
          placeholder={viewer.isStaff ? 'Responder como equipe...' : 'Escreva um comentário...'}
        />
        <TicketImagePicker key={pickerKey} onChange={setDraftImageIds} />
        <div className="flex justify-end">
          <Button onClick={send} disabled={!draft.trim()}>
            {viewer.isStaff ? 'Responder' : 'Comentar'}
          </Button>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </section>
  );
}

/** Bolha de mensagem: a do próprio usuário à direita, a dos outros à esquerda com avatar. */
function Bubble({
  mine,
  staff,
  author,
  time,
  children,
}: {
  mine: boolean;
  staff: boolean;
  author: string;
  time: string;
  children: ReactNode;
}) {
  return (
    <li className={cn('flex items-end gap-2', mine ? 'justify-end' : 'justify-start')}>
      {mine ? null : (
        <span
          aria-hidden="true"
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
            staff
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground ring-1 ring-border'
          )}
        >
          {author.charAt(0)}
        </span>
      )}
      <div
        className={cn(
          'flex min-w-0 max-w-[85%] flex-col gap-1 sm:max-w-[75%]',
          mine ? 'items-end' : 'items-start'
        )}
      >
        <span className="px-1 text-xs text-muted-foreground">
          {author} · {time}
        </span>
        <div
          className={cn(
            'min-w-0 break-words rounded-2xl px-4 py-2.5',
            mine
              ? 'rounded-br-md bg-primary/10 ring-1 ring-primary/20'
              : staff
                ? 'rounded-bl-md bg-card ring-1 ring-primary/30'
                : 'rounded-bl-md bg-card ring-1 ring-border'
          )}
        >
          {children}
        </div>
      </div>
    </li>
  );
}
