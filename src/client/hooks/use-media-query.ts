'use client';

import { useSyncExternalStore } from 'react';

/**
 * true enquanto a media query casa. No servidor (e sem `matchMedia`, como no jsdom) é `false` —
 * quem usa deve tratar `false` como o caso padrão (desktop) para não piscar na hidratação.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false),
    () => false
  );
}
