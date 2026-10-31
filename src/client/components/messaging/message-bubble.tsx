'use client';
import { Check, CheckCheck, Clock, TriangleAlert } from 'lucide-react';
import type { ChatMessage } from '../../../types';
import { cn } from '../../../lib/utils';
import { MessageSourceBadge } from './message-source-badge';

function time(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso)
  );
}

export function MessageBubble({
  message,
  me,
  onRetry,
}: {
  message: ChatMessage;
  me: string;
  onRetry: (clientToken?: string) => void;
}) {
  const mine =
    message.senderId === me || (message.senderId === null && message.direction === 'outbound');
  const failed = message.status === 'failed';

  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <div className={cn('flex max-w-[85%] flex-col', mine ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-2xl px-3 py-2 text-sm shadow-sm',
            mine
              ? 'rounded-br-md bg-primary text-primary-foreground'
              : 'rounded-bl-md border border-border bg-card',
            failed && 'border border-destructive/50'
          )}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
          <span
            className={cn(
              'mt-1 flex items-center gap-1 text-[11px]',
              mine ? 'text-primary-foreground/80' : 'text-muted-foreground'
            )}
          >
            {time(message.createdAt)}
            {mine && message.status === 'pending' && (
              <Clock aria-label="status: enviando" className="h-3 w-3" />
            )}
            {mine && message.status === 'sent' && (
              <Check aria-label="status: enviada" className="h-3 w-3" />
            )}
            {mine && (message.status === 'delivered' || message.status === 'read') && (
              <CheckCheck
                aria-label="status: entregue"
                className={cn('h-3 w-3', message.status === 'read' && 'text-sky-300')}
              />
            )}
            {mine && failed && (
              <TriangleAlert aria-label="status: falhou" className="h-3 w-3 text-destructive" />
            )}
          </span>
        </div>
        <MessageSourceBadge source={message.source} />
        {failed && (
          <button
            type="button"
            onClick={() => onRetry(message.clientToken)}
            className="mt-0.5 text-[11px] font-semibold text-destructive underline"
          >
            Reenviar
          </button>
        )}
      </div>
    </div>
  );
}
