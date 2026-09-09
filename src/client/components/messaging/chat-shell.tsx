'use client';
import { useState } from 'react';
import { useAuth } from '../../providers/auth-provider';
import { useConversations } from './use-conversations';
import { ConversationList } from './conversation-list';
import { ChatWindow } from './chat-window';

function initialActiveUid(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('c');
}

export function ChatShell() {
  const { user } = useAuth();
  const { items, loading, refresh, markReadLocally } = useConversations();
  const [activeUid, setActiveUid] = useState<string | null>(initialActiveUid);

  const active = items.find((x) => x.uid === activeUid) ?? null;

  const select = (uid: string) => {
    setActiveUid(uid);
    markReadLocally(uid);
    const url = new URL(window.location.href);
    url.searchParams.set('c', uid);
    window.history.replaceState(null, '', url);
  };

  const me = user?.user_id ?? '';

  return (
    // flex + min-h-0 (não grid com altura fixa) para o ChatWindow herdar a altura real
    // do container e manter o input de envio sempre colado embaixo, no desktop e no mobile.
    // Requer que o pai seja uma coluna flex com altura definida (ver page da tela de chat).
    <div className="flex min-h-0 flex-1 gap-4">
      <div
        className={
          'min-h-0 w-full lg:w-[340px] lg:shrink-0 ' +
          (active ? 'hidden lg:block' : 'block')
        }
      >
        <ConversationList
          items={items}
          activeUid={activeUid}
          loading={loading}
          onSelect={select}
          onRefresh={refresh}
        />
      </div>
      <div className={'min-h-0 min-w-0 flex-1 ' + (active ? 'block' : 'hidden lg:block')}>
        {active ? (
          <ChatWindow conversation={active} me={me} onBack={() => setActiveUid(null)} />
        ) : (
          <div className="hidden h-full items-center justify-center rounded-2xl border border-border bg-card text-sm text-muted-foreground lg:flex">
            Selecione uma conversa
          </div>
        )}
      </div>
    </div>
  );
}
