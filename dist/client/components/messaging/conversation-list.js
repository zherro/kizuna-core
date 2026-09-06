'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { RefreshCw } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { MessageSourceBadge } from './message-source-badge';
function time(iso) {
    if (!iso)
        return '';
    return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}
export function ConversationList({ items, activeUid, loading, onSelect, onRefresh, }) {
    return (_jsxs("div", { className: "flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-border bg-muted/20 px-4 py-3", children: [_jsx("span", { className: "text-sm font-semibold", children: "Conversas" }), _jsx("button", { type: "button", onClick: onRefresh, "aria-label": "Atualizar", className: "text-muted-foreground hover:text-foreground", children: _jsx(RefreshCw, { className: "h-4 w-4" }) })] }), _jsxs("div", { className: "flex-1 space-y-1 overflow-y-auto p-2", children: [loading && items.length === 0 && (_jsx("p", { className: "p-3 text-sm text-muted-foreground", children: "Carregando\u2026" })), !loading && items.length === 0 && (_jsx("p", { className: "p-3 text-sm text-muted-foreground", children: "Nenhuma conversa ainda." })), items.map((c) => (_jsxs("button", { type: "button", onClick: () => onSelect(c.uid), className: cn('w-full rounded-xl border px-3 py-2.5 text-left transition', c.uid === activeUid
                            ? 'border-primary bg-primary/10'
                            : 'border-transparent hover:bg-muted/40'), children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("span", { className: "line-clamp-1 text-sm font-semibold", children: c.other?.displayName ?? 'Conversa' }), _jsx("span", { className: "shrink-0 text-[11px] text-muted-foreground", children: time(c.lastMessageAt) })] }), _jsxs("div", { className: "mt-0.5 flex items-center gap-2", children: [_jsx("span", { className: "line-clamp-1 flex-1 text-xs text-muted-foreground", children: c.lastMessagePreview ?? '—' }), c.unreadCount > 0 && (_jsx("span", { className: "inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground", children: c.unreadCount }))] }), c.lastMessageSource && c.lastMessageSource !== 'platform' && (_jsx(MessageSourceBadge, { source: c.lastMessageSource }))] }, c.uid)))] })] }));
}
//# sourceMappingURL=conversation-list.js.map