'use client';
import { Fragment, useEffect, useRef } from 'react';
import type { ChatMessage } from '../../../types';
import { MessageBubble } from './message-bubble';
import { groupByDay } from './day-label';

export function MessageList({
  messages,
  me,
  hasMore,
  onLoadOlder,
  onRetry,
}: {
  messages: ChatMessage[];
  me: string;
  hasMore: boolean;
  onLoadOlder: () => void;
  onRetry: (clientToken?: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // auto-scroll to the bottom only when a message was appended (new), not when older ones prepend
    if (messages.length > lastCount.current) {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
      if (nearBottom || lastCount.current === 0) el.scrollTop = el.scrollHeight;
    }
    lastCount.current = messages.length;
  }, [messages]);

  return (
    <div ref={ref} className="flex-1 space-y-3 overflow-y-auto p-4">
      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onLoadOlder}
            className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted/40"
          >
            Carregar mensagens anteriores
          </button>
        </div>
      )}
      {groupByDay(messages).map((group) => (
        <Fragment key={group.key}>
          <div className="sticky top-0 z-10 flex justify-center py-1">
            <span className="rounded-full bg-muted/80 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-sm">
              {group.label}
            </span>
          </div>
          {group.items.map((m) => (
            <MessageBubble key={m.uid} message={m} me={me} onRetry={onRetry} />
          ))}
        </Fragment>
      ))}
    </div>
  );
}
