'use client';

import { useEffect, type RefObject } from 'react';

/**
 * Publica a altura real do header sticky em `--kz-header-h` (no `<html>`), para que
 * elementos sticky abaixo dele (ex.: coluna de filtros da busca) gruden sem ficar por
 * baixo. Mede em vez de fixar um número: as duas variantes de topbar têm alturas
 * diferentes e a classic varia com logo/ações.
 */
export function useHeaderHeightVar(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const apply = () => root.style.setProperty('--kz-header-h', `${el.offsetHeight}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty('--kz-header-h');
    };
  }, [ref]);
}
