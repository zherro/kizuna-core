// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';

const api = vi.hoisted(() => ({
  fetchMessages: vi.fn(),
  postMessage: vi.fn(),
  patchRead: vi.fn(async () => new Response('{}')),
}));
vi.mock('./messaging-api', () => api);
vi.mock('./use-messaging-config', () => ({
  useMessagingConfig: () => ({
    messagesPerPage: 30,
    pollActiveMs: 8000,
    pollIdleMs: 25000,
    pollBackoffMs: [5000, 10000, 20000],
    enableWhatsapp: false,
  }),
}));

const msg = (id: number) => ({
  id,
  uid: `m-${id}`,
  conversationId: 1,
  senderId: 'u-a',
  source: 'platform',
  direction: 'outbound',
  messageType: 'text',
  content: `#${id}`,
  status: 'sent',
  externalId: null,
  createdAt: new Date(id * 1000).toISOString(),
});

async function loadHook() {
  return (await import('./use-conversation-messages')).useConversationMessages;
}

beforeEach(() => {
  vi.useFakeTimers();
  // @testing-library/react's waitFor advances timers via a jest-like global when
  // fake timers are active; vitest doesn't provide it, so shim it.
  vi.stubGlobal('jest', { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) });
  api.fetchMessages.mockReset();
  api.postMessage.mockReset();
});
afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useConversationMessages', () => {
  it('não busca nada quando uid é null', async () => {
    const useConversationMessages = await loadHook();
    renderHook(() => useConversationMessages(null));
    expect(api.fetchMessages).not.toHaveBeenCalled();
  });

  it('carga inicial pega as últimas N e depois faz delta com ?after=lastId', async () => {
    api.fetchMessages
      .mockResolvedValueOnce({ items: [msg(1), msg(2), msg(3)], nextCursor: 1, hasMore: true })
      .mockResolvedValueOnce({ items: [msg(4)], nextCursor: null, hasMore: false });
    const useConversationMessages = await loadHook();
    const { result } = renderHook(() => useConversationMessages('c-1'));
    await waitFor(() => expect(result.current.messages).toHaveLength(3));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(8000);
    });
    expect(api.fetchMessages).toHaveBeenLastCalledWith('c-1', { after: 3 });
    await waitFor(() =>
      expect(result.current.messages.map((m: any) => m.id)).toEqual([1, 2, 3, 4])
    );
  });

  it('delta que traz id já conhecido não duplica', async () => {
    api.fetchMessages
      .mockResolvedValueOnce({ items: [msg(1), msg(2)], nextCursor: null, hasMore: false })
      .mockResolvedValueOnce({ items: [msg(2), msg(3)], nextCursor: null, hasMore: false });
    const useConversationMessages = await loadHook();
    const { result } = renderHook(() => useConversationMessages('c-1'));
    await waitFor(() => expect(result.current.messages).toHaveLength(2));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8000);
    });
    await waitFor(() =>
      expect(result.current.messages.map((m: any) => m.id)).toEqual([1, 2, 3])
    );
  });

  it('pausa o polling quando document.hidden e refaz ao voltar', async () => {
    api.fetchMessages.mockResolvedValue({ items: [msg(1)], nextCursor: null, hasMore: false });
    const useConversationMessages = await loadHook();
    renderHook(() => useConversationMessages('c-1'));
    await waitFor(() => expect(api.fetchMessages).toHaveBeenCalledTimes(1));

    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
    });
    expect(api.fetchMessages).toHaveBeenCalledTimes(1); // pausado

    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await waitFor(() => expect(api.fetchMessages).toHaveBeenCalledTimes(2)); // refetch imediato
  });

  it('erro no delta aplica backoff progressivo', async () => {
    api.fetchMessages
      .mockResolvedValueOnce({ items: [msg(1)], nextCursor: null, hasMore: false })
      .mockRejectedValueOnce(new Error('net'))
      .mockRejectedValueOnce(new Error('net'))
      .mockResolvedValue({ items: [], nextCursor: null, hasMore: false });
    const useConversationMessages = await loadHook();
    renderHook(() => useConversationMessages('c-1'));
    await waitFor(() => expect(api.fetchMessages).toHaveBeenCalledTimes(1));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8000);
    }); // 1ª tentativa de delta -> erro
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4999);
    });
    expect(api.fetchMessages).toHaveBeenCalledTimes(2);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    }); // backoff[0]=5000
    await waitFor(() => expect(api.fetchMessages).toHaveBeenCalledTimes(3));
  });

  it('send otimista: aparece pending, vira sent no sucesso', async () => {
    api.fetchMessages.mockResolvedValue({ items: [], nextCursor: null, hasMore: false });
    api.postMessage.mockResolvedValueOnce({ ...msg(99), status: 'sent' });
    const useConversationMessages = await loadHook();
    const { result } = renderHook(() => useConversationMessages('c-1'));
    await waitFor(() => expect(api.fetchMessages).toHaveBeenCalled());
    act(() => {
      result.current.send('oi');
    });
    expect(result.current.messages[0].status).toBe('pending');
    await waitFor(() => expect(result.current.messages[0].status).toBe('sent'));
  });

  it('send que falha vira failed e retry reenvia com o mesmo clientToken', async () => {
    api.fetchMessages.mockResolvedValue({ items: [], nextCursor: null, hasMore: false });
    api.postMessage.mockRejectedValueOnce(new Error('500'));
    const useConversationMessages = await loadHook();
    const { result } = renderHook(() => useConversationMessages('c-1'));
    await waitFor(() => expect(api.fetchMessages).toHaveBeenCalled());
    await act(async () => {
      result.current.send('oi');
    });
    await waitFor(() => expect(result.current.messages[0].status).toBe('failed'));
    const token = result.current.messages[0].clientToken;
    api.postMessage.mockResolvedValueOnce({ ...msg(5), status: 'sent' });
    await act(async () => {
      result.current.retry(token);
    });
    expect(api.postMessage).toHaveBeenLastCalledWith('c-1', { content: 'oi', clientToken: token });
  });
});
