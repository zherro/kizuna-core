'use client';
import { ArrowLeft } from 'lucide-react';
import type { ChatConversationSummary } from '../../../types';
import { useConversationMessages } from './use-conversation-messages';
import { MessageList } from './message-list';
import { MessageListSkeleton } from './message-list-skeleton';
import { MessageInput } from './message-input';

export function ChatWindow({
  conversation,
  me,
  onBack,
}: {
  conversation: ChatConversationSummary;
  me: string;
  onBack?: () => void;
}) {
  const { messages, status, hasMore, sending, loadOlder, send, retry } = useConversationMessages(
    conversation.uid
  );

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-4 py-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar"
            className="text-muted-foreground lg:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="min-w-0">
          <p className="line-clamp-1 text-sm font-semibold">
            {conversation.other?.displayName ?? 'Conversa'}
          </p>
        </div>
      </div>

      {status === 'error' ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
          Não foi possível carregar as mensagens.
        </div>
      ) : status === 'loading' || status === 'idle' ? (
        <MessageListSkeleton />
      ) : (
        <MessageList
          messages={messages}
          me={me}
          hasMore={hasMore}
          onLoadOlder={loadOlder}
          onRetry={retry}
        />
      )}

      <MessageInput disabled={sending} onSend={send} />
    </div>
  );
}
