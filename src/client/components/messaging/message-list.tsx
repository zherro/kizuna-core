'use client';
import { useEffect, useRef } from 'react';
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
      {/* Cada dia é um bloco próprio: assim o separador sticky só "flutua" enquanto
          o bloco daquele dia está visível — o bloco seguinte empurra o anterior
          pra cima (um de cada vez), em vez de empilharem todos no topo. */}
      {groupByDay(messages).map((group) => (
        <section key={group.key} className="space-y-3">
          <div className="sticky top-0 z-10 flex justify-center py-1">
            <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm">
              {group.label}
            </span>
          </div>
          {group.items.map((m) => (
            <MessageBubble key={m.uid} message={m} me={me} onRetry={onRetry} />
          ))}
        </section>
      ))}
    </div>
  );
}
