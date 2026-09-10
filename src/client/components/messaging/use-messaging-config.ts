'use client';
import { useEffect, useState } from 'react';
import type { MessagingClientConfig } from '../../../types';
import { fetchConfig } from './messaging-api';

const DEFAULTS: MessagingClientConfig = {
  messagesPerPage: 30,
  pollActiveMs: 8000,
  pollIdleMs: 25000,
  pollBackoffMs: [5000, 10000, 20000, 30000],
  enableWhatsapp: false,
};

let cache: MessagingClientConfig | null = null;

export function useMessagingConfig(): MessagingClientConfig {
  const [cfg, setCfg] = useState<MessagingClientConfig>(cache ?? DEFAULTS);
  useEffect(() => {
    if (cache) return;
    let alive = true;
    fetchConfig()
      .then((c) => {
        cache = c;
        if (alive) setCfg(c);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return cfg;
}
