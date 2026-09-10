import { jsx as _jsx } from "react/jsx-runtime";
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageBubble } from './message-bubble';
const base = {
    id: 1,
    uid: 'm-1',
    conversationId: 1,
    senderId: 'u-me',
    source: 'platform',
    direction: 'outbound',
    messageType: 'text',
    content: 'olá',
    status: 'sent',
    externalId: null,
    createdAt: '2026-09-06T10:00:00Z',
};
const cls = (el) => el?.className ?? '';
afterEach(cleanup);
describe('MessageBubble', () => {
    it('mensagem do próprio usuário alinha à direita', () => {
        const { container } = render(_jsx(MessageBubble, { message: base, me: "u-me", onRetry: vi.fn() }));
        expect(cls(container.firstChild)).toContain('justify-end');
    });
    it('mensagem do outro alinha à esquerda e não mostra status', () => {
        const { container } = render(_jsx(MessageBubble, { message: { ...base, senderId: 'u-other' }, me: "u-me", onRetry: vi.fn() }));
        expect(cls(container.firstChild)).toContain('justify-start');
        expect(screen.queryByLabelText(/status/i)).toBeNull();
    });
    it('status failed mostra Reenviar e chama onRetry com o clientToken', async () => {
        const onRetry = vi.fn();
        render(_jsx(MessageBubble, { message: { ...base, status: 'failed', clientToken: 'tok-9' }, me: "u-me", onRetry: onRetry }));
        await userEvent.click(screen.getByRole('button', { name: /reenviar/i }));
        expect(onRetry).toHaveBeenCalledWith('tok-9');
    });
    it('origem whatsapp mostra o badge; platform não', () => {
        const { rerender } = render(_jsx(MessageBubble, { message: { ...base, source: 'whatsapp' }, me: "u-me", onRetry: vi.fn() }));
        expect(screen.queryByText(/whatsapp/i)).not.toBeNull();
        rerender(_jsx(MessageBubble, { message: base, me: "u-me", onRetry: vi.fn() }));
        expect(screen.queryByText(/whatsapp/i)).toBeNull();
    });
    it('mensagem sem sender mas outbound conta como minha', () => {
        const { container } = render(_jsx(MessageBubble, { message: { ...base, senderId: null }, me: "u-me", onRetry: vi.fn() }));
        expect(cls(container.firstChild)).toContain('justify-end');
    });
});
//# sourceMappingURL=message-bubble.test.js.map