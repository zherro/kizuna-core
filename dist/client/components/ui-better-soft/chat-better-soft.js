'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { MessageCircleMore, SendHorizonal } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { cn } from '../../../lib/utils';
function formatTime(isoDate) {
    return new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(isoDate));
}
function formatDate(isoDate) {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(new Date(isoDate));
}
export function ChatBetterSoft({ conversations }) {
    const [activeId, setActiveId] = useState(conversations[0]?.id ?? '');
    const activeConversation = useMemo(() => conversations.find((conversation) => conversation.id === activeId) ?? conversations[0], [activeId, conversations]);
    if (!activeConversation) {
        return (_jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Chat" }) }), _jsx(CardContent, { children: _jsx("p", { className: "text-sm text-muted-foreground", children: "Nenhuma conversa disponivel no momento." }) })] }));
    }
    return (_jsxs("div", { className: "grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]", children: [_jsxs(Card, { className: "overflow-hidden", children: [_jsx(CardHeader, { className: "border-b bg-muted/20", children: _jsx(CardTitle, { className: "text-base", children: "Conversas" }) }), _jsx(CardContent, { className: "max-h-[680px] space-y-2 overflow-y-auto p-3", children: conversations.map((conversation) => {
                            const selected = conversation.id === activeConversation.id;
                            return (_jsxs("button", { type: "button", onClick: () => setActiveId(conversation.id), className: cn('w-full rounded-xl border px-3 py-3 text-left transition', selected ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/40'), children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { children: [_jsx("p", { className: "line-clamp-1 text-sm font-semibold", children: conversation.title }), _jsx("p", { className: "line-clamp-1 text-xs text-muted-foreground", children: conversation.participant })] }), _jsx("span", { className: "shrink-0 text-[11px] text-muted-foreground", children: formatTime(conversation.updatedAt) })] }), _jsxs("div", { className: "mt-2 flex items-center gap-2", children: [conversation.waitingForReply ? (_jsx("span", { className: "rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700", children: "Sem resposta" })) : (_jsx("span", { className: "rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700", children: "Respondida" })), conversation.unreadCount > 0 ? (_jsx("span", { className: "ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-primary-foreground", children: conversation.unreadCount })) : null] })] }, conversation.id));
                        }) })] }), _jsxs(Card, { className: "overflow-hidden", children: [_jsx(CardHeader, { className: "border-b bg-muted/20", children: _jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("div", { children: [_jsx(CardTitle, { className: "text-base", children: activeConversation.title }), _jsxs("p", { className: "text-xs text-muted-foreground", children: [activeConversation.participant, " \u2022 atualizado em", ' ', formatDate(activeConversation.updatedAt)] })] }), _jsx(MessageCircleMore, { className: "h-4 w-4 text-primary" })] }) }), _jsxs(CardContent, { className: "flex min-h-[680px] flex-col p-0", children: [_jsx("div", { className: "flex-1 space-y-3 overflow-y-auto p-4", children: activeConversation.messages.map((message) => (_jsx("div", { className: cn('flex', message.author === 'me' ? 'justify-end' : 'justify-start'), children: _jsxs("div", { className: cn('max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm', message.author === 'me'
                                            ? 'rounded-br-md bg-primary text-primary-foreground'
                                            : 'rounded-bl-md border border-border bg-card'), children: [_jsx("p", { children: message.text }), _jsx("p", { className: cn('mt-1 text-[11px]', message.author === 'me'
                                                    ? 'text-primary-foreground/80'
                                                    : 'text-muted-foreground'), children: formatTime(message.sentAt) })] }) }, message.id))) }), _jsx("form", { className: "border-t bg-background p-3", onSubmit: (event) => event.preventDefault(), children: _jsxs("div", { className: "flex gap-2", children: [_jsx(Input, { placeholder: "Digite sua mensagem...", "aria-label": "Mensagem do chat" }), _jsx(Button, { type: "submit", size: "icon", "aria-label": "Enviar mensagem", children: _jsx(SendHorizonal, { className: "h-4 w-4" }) })] }) })] })] })] }));
}
//# sourceMappingURL=chat-better-soft.js.map