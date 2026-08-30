'use client';

import { useMemo, useState } from 'react';
import { MessageCircleMore, SendHorizonal } from 'lucide-react';
import type { ChatConversation } from '@/types/chat';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { cn } from '../../../lib/utils';

type ChatBetterSoftProps = {
  conversations: ChatConversation[];
};

function formatTime(isoDate: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoDate));
}

function formatDate(isoDate: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(isoDate));
}

export function ChatBetterSoft({ conversations }: ChatBetterSoftProps) {
  const [activeId, setActiveId] = useState(conversations[0]?.id ?? '');

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? conversations[0],
    [activeId, conversations]
  );

  if (!activeConversation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chat</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhuma conversa disponivel no momento.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="text-base">Conversas</CardTitle>
        </CardHeader>
        <CardContent className="max-h-[680px] space-y-2 overflow-y-auto p-3">
          {conversations.map((conversation) => {
            const selected = conversation.id === activeConversation.id;

            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => setActiveId(conversation.id)}
                className={cn(
                  'w-full rounded-xl border px-3 py-3 text-left transition',
                  selected ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/40'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="line-clamp-1 text-sm font-semibold">{conversation.title}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {conversation.participant}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {formatTime(conversation.updatedAt)}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  {conversation.waitingForReply ? (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                      Sem resposta
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      Respondida
                    </span>
                  )}

                  {conversation.unreadCount > 0 ? (
                    <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
                      {conversation.unreadCount}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">{activeConversation.title}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {activeConversation.participant} • atualizado em{' '}
                {formatDate(activeConversation.updatedAt)}
              </p>
            </div>
            <MessageCircleMore className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>

        <CardContent className="flex min-h-[680px] flex-col p-0">
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {activeConversation.messages.map((message) => (
              <div
                key={message.id}
                className={cn('flex', message.author === 'me' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm',
                    message.author === 'me'
                      ? 'rounded-br-md bg-primary text-primary-foreground'
                      : 'rounded-bl-md border border-border bg-card'
                  )}
                >
                  <p>{message.text}</p>
                  <p
                    className={cn(
                      'mt-1 text-[11px]',
                      message.author === 'me'
                        ? 'text-primary-foreground/80'
                        : 'text-muted-foreground'
                    )}
                  >
                    {formatTime(message.sentAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <form className="border-t bg-background p-3" onSubmit={(event) => event.preventDefault()}>
            <div className="flex gap-2">
              <Input placeholder="Digite sua mensagem..." aria-label="Mensagem do chat" />
              <Button type="submit" size="icon" aria-label="Enviar mensagem">
                <SendHorizonal className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
