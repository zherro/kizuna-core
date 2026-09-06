'use client';
import { useEffect, useState } from 'react';
import { fetchConfig } from './messaging-api';
const DEFAULTS = {
    messagesPerPage: 30,
    pollActiveMs: 8000,
    pollIdleMs: 25000,
    pollBackoffMs: [5000, 10000, 20000, 30000],
    enableWhatsapp: false,
};
let cache = null;
export function useMessagingConfig() {
    const [cfg, setCfg] = useState(cache ?? DEFAULTS);
    useEffect(() => {
        if (cache)
            return;
        let alive = true;
        fetchConfig()
            .then((c) => {
            cache = c;
            if (alive)
                setCfg(c);
        })
            .catch(() => { });
        return () => {
            alive = false;
        };
    }, []);
    return cfg;
}
//# sourceMappingURL=use-messaging-config.js.map