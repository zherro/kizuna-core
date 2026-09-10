'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../../../types';
import { fetchMessages, postMessage, patchRead } from './messaging-api';
import { useMessagingConfig } from './use-messaging-config';

type Status = 'idle' | 'loading' | 'ready' | 'error';

export function useConversationMessages(uid: string | null) {
  const cfg = useMessagingConfig();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [hasMore, setHasMore] = useState(false);
  const [sending, setSending] = useState(false);

  const lastIdRef = useRef(0);
  const oldestRef = useRef<number | null>(null);
  const lastActivityRef = useRef(0); // set to Date.now() on load / activity — 0 until then reads as "idle"
  const backoffRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const merge = useCallback((incoming: ChatMessage[]) => {
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id).filter((id) => id > 0));
      const add = incoming.filter((m) => !seen.has(m.id));
      if (!add.length) return prev;
      const next = [...prev, ...add].sort(
        (a, b) => a.id - b.id || a.createdAt.localeCompare(b.createdAt)
      );
      const maxId = next.reduce((mx, m) => Math.max(mx, m.id > 0 ? m.id : 0), 0);
      if (maxId > lastIdRef.current) lastIdRef.current = maxId;
      return next;
    });
  }, []);

  // carga inicial ao trocar de conversa
  useEffect(() => {
    if (!uid) {
      // reset ao sair da conversa (na prática o ChatWindow desmonta, mas o hook precisa suportar
      // uid=null pelo contrato). Sincronização de estado com uma prop externa, não render-derived.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages([]);
      setStatus('idle');
      return;
    }
    let alive = true;
    setStatus('loading');
    setMessages([]);
    lastIdRef.current = 0;
    oldestRef.current = null;
    backoffRef.current = 0;
    lastActivityRef.current = Date.now(); // abrir uma conversa conta como atividade → polling ativo
    fetchMessages(uid, { limit: cfg.messagesPerPage })
      .then((page) => {
        if (!alive) return;
        setMessages(page.items);
        setHasMore(page.hasMore);
        oldestRef.current = page.nextCursor;
        lastIdRef.current = page.items.reduce((mx, m) => Math.max(mx, m.id), 0);
        setStatus('ready');
        const top = page.items[page.items.length - 1];
        if (top) patchRead(uid, top.id).catch(() => {});
      })
      .catch(() => alive && setStatus('error'));
    return () => {
      alive = false;
    };
  }, [uid, cfg.messagesPerPage]);

  // loop de polling adaptativo
  useEffect(() => {
    if (!uid || status === 'idle') return;

    const tick = async () => {
      if (typeof document !== 'undefined' && document.hidden) {
        schedule();
        return;
      }
      try {
        const page = await fetchMessages(uid, { after: lastIdRef.current });
        backoffRef.current = 0;
        if (page.items.length) {
          merge(page.items);
          const newest = page.items[page.items.length - 1];
          lastActivityRef.current = Date.now();
          patchRead(uid, newest.id).catch(() => {});
        }
      } catch {
        backoffRef.current = Math.min(backoffRef.current + 1, cfg.pollBackoffMs.length);
      }
      schedule();
    };

    const schedule = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      let delay: number;
      if (backoffRef.current > 0) delay = cfg.pollBackoffMs[backoffRef.current - 1];
      else
        delay = Date.now() - lastActivityRef.current < 60_000 ? cfg.pollActiveMs : cfg.pollIdleMs;
      timerRef.current = setTimeout(tick, delay);
    };

    schedule();

    const onVisible = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        if (timerRef.current) clearTimeout(timerRef.current);
        tick();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [uid, status, cfg.pollActiveMs, cfg.pollIdleMs, cfg.pollBackoffMs, merge]);

  const loadOlder = useCallback(async () => {
    if (!uid || oldestRef.current == null) return;
    const page = await fetchMessages(uid, {
      before: oldestRef.current,
      limit: cfg.messagesPerPage,
    });
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      return [...page.items.filter((m) => !seen.has(m.id)), ...prev];
    });
    oldestRef.current = page.nextCursor;
    setHasMore(page.hasMore);
  }, [uid, cfg.messagesPerPage]);

  const doSend = useCallback(
    async (text: string, token: string) => {
      if (!uid) return;
      setSending(true);
      try {
        const saved = await postMessage(uid, { content: text, clientToken: token });
        setMessages((prev) => prev.map((m) => (m.clientToken === token ? saved : m)));
        lastActivityRef.current = Date.now();
        if (saved.id > lastIdRef.current) lastIdRef.current = saved.id;
      } catch {
        setMessages((prev) =>
          prev.map((m) => (m.clientToken === token ? { ...m, status: 'failed' } : m))
        );
      } finally {
        setSending(false);
      }
    },
    [uid]
  );

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !uid) return;
      const token = `t-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimistic: ChatMessage = {
        id: -Date.now(),
        uid: token,
        conversationId: 0,
        senderId: null,
        source: 'platform',
        direction: 'outbound',
        messageType: 'text',
        content: trimmed,
        status: 'pending',
        externalId: null,
        createdAt: new Date().toISOString(),
        clientToken: token,
      };
      setMessages((prev) => [...prev, optimistic]);
      void doSend(trimmed, token);
    },
    [uid, doSend]
  );

  const retry = useCallback(
    (token?: string) => {
      if (!token) return;
      const target = messages.find((m) => m.clientToken === token);
      if (!target?.content) return;
      setMessages((prev) =>
        prev.map((m) => (m.clientToken === token ? { ...m, status: 'pending' } : m))
      );
      void doSend(target.content, token);
    },
    [messages, doSend]
  );

  const refreshNow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (uid)
      fetchMessages(uid, { after: lastIdRef.current })
        .then((p) => p.items.length && merge(p.items))
        .catch(() => {});
  }, [uid, merge]);

  return { messages, status, hasMore, sending, loadOlder, send, retry, refreshNow };
}
