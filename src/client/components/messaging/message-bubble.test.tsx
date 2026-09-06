// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageBubble } from './message-bubble';
import type { ChatMessage } from '../../../types';

const base: ChatMessage = {
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

const cls = (el: ChildNode | null) => (el as HTMLElement | null)?.className ?? '';

afterEach(cleanup);

describe('MessageBubble', () => {
  it('mensagem do próprio usuário alinha à direita', () => {
    const { container } = render(<MessageBubble message={base} me="u-me" onRetry={vi.fn()} />);
    expect(cls(container.firstChild)).toContain('justify-end');
  });

  it('mensagem do outro alinha à esquerda e não mostra status', () => {
    const { container } = render(
      <MessageBubble message={{ ...base, senderId: 'u-other' }} me="u-me" onRetry={vi.fn()} />
    );
    expect(cls(container.firstChild)).toContain('justify-start');
    expect(screen.queryByLabelText(/status/i)).toBeNull();
  });

  it('status failed mostra Reenviar e chama onRetry com o clientToken', async () => {
    const onRetry = vi.fn();
    render(
      <MessageBubble
        message={{ ...base, status: 'failed', clientToken: 'tok-9' }}
        me="u-me"
        onRetry={onRetry}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /reenviar/i }));
    expect(onRetry).toHaveBeenCalledWith('tok-9');
  });

  it('origem whatsapp mostra o badge; platform não', () => {
    const { rerender } = render(
      <MessageBubble message={{ ...base, source: 'whatsapp' }} me="u-me" onRetry={vi.fn()} />
    );
    expect(screen.queryByText(/whatsapp/i)).not.toBeNull();
    rerender(<MessageBubble message={base} me="u-me" onRetry={vi.fn()} />);
    expect(screen.queryByText(/whatsapp/i)).toBeNull();
  });

  it('mensagem sem sender mas outbound conta como minha', () => {
    const { container } = render(
      <MessageBubble message={{ ...base, senderId: null }} me="u-me" onRetry={vi.fn()} />
    );
    expect(cls(container.firstChild)).toContain('justify-end');
  });
});
