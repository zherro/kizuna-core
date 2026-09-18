import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
vi.mock('./use-conversation-messages', () => ({
    useConversationMessages: () => ({
        messages: [],
        status: 'ready',
        hasMore: false,
        sending: false,
        loadOlder: vi.fn(),
        send: vi.fn(),
        retry: vi.fn(),
    }),
}));
import { ChatWindow } from './chat-window';
afterEach(cleanup);
const conversation = {
    id: 1,
    uid: 'c-1',
    status: 'open',
    contextType: 'pedido',
    contextId: 'p-uid-1',
    lastMessageAt: null,
    lastMessagePreview: null,
    lastMessageSource: null,
    unreadCount: 0,
    other: null,
};
describe('ChatWindow renderContextBanner', () => {
    it('renderiza o banner do contexto quando fornecido', () => {
        render(_jsx(ChatWindow, { conversation: conversation, me: "u-1", renderContextBanner: (c) => _jsxs("div", { children: ["Banner de ", c.contextType] }) }));
        expect(screen.getByText('Banner de pedido')).toBeTruthy();
    });
    it('sem renderContextBanner, não renderiza nada extra (comportamento atual preservado)', () => {
        render(_jsx(ChatWindow, { conversation: conversation, me: "u-1" }));
        expect(screen.queryByText(/Banner de/)).toBeNull();
    });
});
//# sourceMappingURL=chat-window.test.js.map