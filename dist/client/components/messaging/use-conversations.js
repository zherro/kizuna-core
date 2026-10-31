'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchConversations } from './messaging-api';
import { useMessagingConfig } from './use-messaging-config';
export function useConversations() {
    const cfg = useMessagingConfig();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const timerRef = useRef(null);
    const refresh = useCallback(async () => {
        try {
            const page = await fetchConversations();
            setItems(page.items);
            setError(null);
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        // busca inicial + assina o polling da lista — sincronização com o backend (setState só após
        // o await dentro de refresh), não um setState derivável de render.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        refresh();
        const loop = () => {
            if (typeof document !== 'undefined' && document.hidden)
                return;
            refresh();
        };
        timerRef.current = setInterval(loop, cfg.pollIdleMs);
        const onVisible = () => {
            if (!document.hidden)
                refresh();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            if (timerRef.current)
                clearInterval(timerRef.current);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [refresh, cfg.pollIdleMs]);
    const markReadLocally = useCallback((uid) => {
        setItems((prev) => prev.map((c) => (c.uid === uid ? { ...c, unreadCount: 0 } : c)));
    }, []);
    return { items, loading, error, refresh, markReadLocally };
}
//# sourceMappingURL=use-conversations.js.map