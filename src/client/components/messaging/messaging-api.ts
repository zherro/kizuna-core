import type {
  ChatConversationSummary,
  ChatMessage,
  MessagesPage,
  MessagingClientConfig,
} from '../../../types';

async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { message?: string }).message || 'Erro na requisição.');
  return body as T;
}

export const fetchConfig = () => fetch('/api/chat/config').then((r) => json<MessagingClientConfig>(r));

export const fetchConversations = (before?: string | null) =>
  fetch(`/api/chat/conversations${before ? `?before=${encodeURIComponent(before)}` : ''}`).then((r) =>
    json<{ items: ChatConversationSummary[]; nextCursor: string | null; hasMore: boolean }>(r)
  );

export const fetchMessages = (
  uid: string,
  p: { limit?: number; before?: number; after?: number }
) => {
  const qs = new URLSearchParams();
  if (p.limit) qs.set('limit', String(p.limit));
  if (p.before) qs.set('before', String(p.before));
  if (p.after != null) qs.set('after', String(p.after));
  return fetch(`/api/chat/conversations/${uid}/messages?${qs}`).then((r) => json<MessagesPage>(r));
};

export const postMessage = (uid: string, body: { content: string; clientToken: string }) =>
  fetch(`/api/chat/conversations/${uid}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => json<ChatMessage>(r));

export const patchRead = (uid: string, upToMessageId: number) =>
  fetch(`/api/chat/conversations/${uid}/read`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ upToMessageId }),
  });
