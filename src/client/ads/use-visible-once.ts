'use client';
import { useEffect, useRef, type RefObject } from 'react';

/**
 * Dispara `onVisible` uma vez por `resetKey` quando o elemento fica ao menos `ratio` visível
 * por `ms` contínuos. Sair da tela cancela o cronômetro. Sem IntersectionObserver, não faz nada.
 */
export function useVisibleFor(
  ref: RefObject<Element | null>,
  opts: { ratio: number; ms: number },
  onVisible: () => void,
  resetKey: unknown,
  enabled = true,
): void {
  const cb = useRef(onVisible);
  cb.current = onVisible;
  const { ratio, ms } = opts;

  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || typeof IntersectionObserver === 'undefined') return;
    let fired = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const clear = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[entries.length - 1];
        if (!e) return;
        const visible = e.isIntersecting && e.intersectionRatio >= ratio;
        if (!visible) return clear();
        if (fired || timer) return;
        timer = setTimeout(() => {
          timer = null;
          fired = true;
          cb.current();
        }, ms);
      },
      { threshold: [0, ratio, 1] },
    );
    io.observe(el);
    return () => {
      clear();
      io.disconnect();
    };
  }, [ref, ratio, ms, resetKey, enabled]);
}
