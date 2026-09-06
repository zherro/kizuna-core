'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatConversationSummary } from '../../../types';
import { fetchConversations } from './messaging-api';
import { useMessagingConfig } from './use-messaging-config';

export function useConversations() {
  const cfg = useMessagingConfig();
  const [items, setItems] = useState<ChatConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const page = await fetchConversations();
      setItems(page.items);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const loop = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      refresh();
    };
    timerRef.current = setInterval(loop, cfg.pollIdleMs);
    const onVisible = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh, cfg.pollIdleMs]);

  const markReadLocally = useCallback((uid: string) => {
    setItems((prev) => prev.map((c) => (c.uid === uid ? { ...c, unreadCount: 0 } : c)));
  }, []);

  return { items, loading, error, refresh, markReadLocally };
}
