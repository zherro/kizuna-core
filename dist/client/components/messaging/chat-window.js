'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowLeft } from 'lucide-react';
import { useConversationMessages } from './use-conversation-messages';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
export function ChatWindow({ conversation, me, onBack, }) {
    const { messages, status, hasMore, sending, loadOlder, send, retry } = useConversationMessages(conversation.uid);
    return (_jsxs("div", { className: "flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card", children: [_jsxs("div", { className: "flex items-center gap-2 border-b border-border bg-muted/20 px-4 py-3", children: [onBack && (_jsx("button", { type: "button", onClick: onBack, "aria-label": "Voltar", className: "text-muted-foreground lg:hidden", children: _jsx(ArrowLeft, { className: "h-4 w-4" }) })), _jsx("div", { className: "min-w-0", children: _jsx("p", { className: "line-clamp-1 text-sm font-semibold", children: conversation.other?.displayName ?? 'Conversa' }) })] }), status === 'error' ? (_jsx("div", { className: "flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground", children: "N\u00E3o foi poss\u00EDvel carregar as mensagens." })) : (_jsx(MessageList, { messages: messages, me: me, hasMore: hasMore, onLoadOlder: loadOlder, onRetry: retry })), _jsx(MessageInput, { disabled: sending, onSend: send })] }));
}
//# sourceMappingURL=chat-window.js.map