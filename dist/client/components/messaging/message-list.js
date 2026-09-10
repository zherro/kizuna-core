'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { MessageBubble } from './message-bubble';
import { groupByDay } from './day-label';
export function MessageList({ messages, me, hasMore, onLoadOlder, onRetry, }) {
    const ref = useRef(null);
    const lastCount = useRef(0);
    useEffect(() => {
        const el = ref.current;
        if (!el)
            return;
        // auto-scroll to the bottom only when a message was appended (new), not when older ones prepend
        if (messages.length > lastCount.current) {
            const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
            if (nearBottom || lastCount.current === 0)
                el.scrollTop = el.scrollHeight;
        }
        lastCount.current = messages.length;
    }, [messages]);
    return (_jsxs("div", { ref: ref, className: "flex-1 space-y-3 overflow-y-auto p-4", children: [hasMore && (_jsx("div", { className: "flex justify-center", children: _jsx("button", { type: "button", onClick: onLoadOlder, className: "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted/40", children: "Carregar mensagens anteriores" }) })), groupByDay(messages).map((group) => (_jsxs("section", { className: "space-y-3", children: [_jsx("div", { className: "sticky top-0 z-10 flex justify-center py-1", children: _jsx("span", { className: "rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm", children: group.label }) }), group.items.map((m) => (_jsx(MessageBubble, { message: m, me: me, onRetry: onRetry }, m.uid)))] }, group.key)))] }));
}
//# sourceMappingURL=message-list.js.map