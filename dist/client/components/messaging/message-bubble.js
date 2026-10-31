'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Check, CheckCheck, Clock, TriangleAlert } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { MessageSourceBadge } from './message-source-badge';
function time(iso) {
    return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}
export function MessageBubble({ message, me, onRetry, }) {
    const mine = message.senderId === me || (message.senderId === null && message.direction === 'outbound');
    const failed = message.status === 'failed';
    return (_jsx("div", { className: cn('flex', mine ? 'justify-end' : 'justify-start'), children: _jsxs("div", { className: cn('flex max-w-[85%] flex-col', mine ? 'items-end' : 'items-start'), children: [_jsxs("div", { className: cn('rounded-2xl px-3 py-2 text-sm shadow-sm', mine
                        ? 'rounded-br-md bg-primary text-primary-foreground'
                        : 'rounded-bl-md border border-border bg-card', failed && 'border border-destructive/50'), children: [_jsx("p", { className: "whitespace-pre-wrap break-words", children: message.content }), _jsxs("span", { className: cn('mt-1 flex items-center gap-1 text-[11px]', mine ? 'text-primary-foreground/80' : 'text-muted-foreground'), children: [time(message.createdAt), mine && message.status === 'pending' && (_jsx(Clock, { "aria-label": "status: enviando", className: "h-3 w-3" })), mine && message.status === 'sent' && (_jsx(Check, { "aria-label": "status: enviada", className: "h-3 w-3" })), mine && (message.status === 'delivered' || message.status === 'read') && (_jsx(CheckCheck, { "aria-label": "status: entregue", className: cn('h-3 w-3', message.status === 'read' && 'text-sky-300') })), mine && failed && (_jsx(TriangleAlert, { "aria-label": "status: falhou", className: "h-3 w-3 text-destructive" }))] })] }), _jsx(MessageSourceBadge, { source: message.source }), failed && (_jsx("button", { type: "button", onClick: () => onRetry(message.clientToken), className: "mt-0.5 text-[11px] font-semibold text-destructive underline", children: "Reenviar" }))] }) }));
}
//# sourceMappingURL=message-bubble.js.map