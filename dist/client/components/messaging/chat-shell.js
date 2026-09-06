'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useAuth } from '../../providers/auth-provider';
import { useConversations } from './use-conversations';
import { ConversationList } from './conversation-list';
import { ChatWindow } from './chat-window';
export function ChatShell() {
    const { user } = useAuth();
    const { items, loading, refresh, markReadLocally } = useConversations();
    const [activeUid, setActiveUid] = useState(null);
    // read ?c= on mount
    useEffect(() => {
        const c = new URLSearchParams(window.location.search).get('c');
        if (c)
            setActiveUid(c);
    }, []);
    const active = items.find((x) => x.uid === activeUid) ?? null;
    const select = (uid) => {
        setActiveUid(uid);
        markReadLocally(uid);
        const url = new URL(window.location.href);
        url.searchParams.set('c', uid);
        window.history.replaceState(null, '', url);
    };
    const me = user?.user_id ?? '';
    return (_jsxs("div", { className: "grid h-[calc(100dvh-8rem)] gap-4 lg:grid-cols-[340px_minmax(0,1fr)]", children: [_jsx("div", { className: active ? 'hidden lg:block' : 'block', children: _jsx(ConversationList, { items: items, activeUid: activeUid, loading: loading, onSelect: select, onRefresh: refresh }) }), _jsx("div", { className: active ? 'block' : 'hidden lg:block', children: active ? (_jsx(ChatWindow, { conversation: active, me: me, onBack: () => setActiveUid(null) })) : (_jsx("div", { className: "hidden h-full items-center justify-center rounded-2xl border border-border bg-card text-sm text-muted-foreground lg:flex", children: "Selecione uma conversa" })) })] }));
}
//# sourceMappingURL=chat-shell.js.map