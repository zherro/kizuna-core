'use client';
import { RefreshCw } from 'lucide-react';
import type { ChatConversationSummary } from '../../../types';
import { cn } from '../../../lib/utils';
import { MessageSourceBadge } from './message-source-badge';

function time(iso: string | null) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso)
  );
}

export function ConversationList({
  items,
  activeUid,
  loading,
  onSelect,
  onRefresh,
}: {
  items: ChatConversationSummary[];
  activeUid: string | null;
  loading: boolean;
  onSelect: (uid: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-3">
        <span className="text-sm font-semibold">Conversas</span>
        <button
          type="button"
          onClick={onRefresh}
          aria-label="Atualizar"
          className="text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {loading && items.length === 0 && (
          <p className="p-3 text-sm text-muted-foreground">Carregando…</p>
        )}
        {!loading && items.length === 0 && (
          <p className="p-3 text-sm text-muted-foreground">Nenhuma conversa ainda.</p>
        )}
        {items.map((c) => (
          <button
            key={c.uid}
            type="button"
            onClick={() => onSelect(c.uid)}
            className={cn(
              'w-full rounded-xl border px-3 py-2.5 text-left transition',
              c.uid === activeUid
                ? 'border-primary bg-primary/10'
                : 'border-transparent hover:bg-muted/40'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="line-clamp-1 text-sm font-semibold">
                {c.other?.displayName ?? 'Conversa'}
              </span>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {time(c.lastMessageAt)}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="line-clamp-1 flex-1 text-xs text-muted-foreground">
                {c.lastMessagePreview ?? '—'}
              </span>
              {c.unreadCount > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                  {c.unreadCount}
                </span>
              )}
            </div>
            {c.lastMessageSource && c.lastMessageSource !== 'platform' && (
              <MessageSourceBadge source={c.lastMessageSource} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
