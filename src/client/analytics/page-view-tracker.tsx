'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { PAGE_VIEW_EXCLUDE, sendPageView, whenIdle } from './page-view';
import { getSessionUtm } from './utm-session';

/**
 * Conta a visita de cada página (page_view) — monte uma vez no layout do site. Não renderiza nada.
 * Guarda os utm_* da chegada na sessão na hora (para os eventos seguintes) e envia por beacon só
 * depois do `load`, com o navegador ocioso. Troca de rota no cliente conta a página nova.
 * Painel e API nunca contam; `exclude` substitui a lista de prefixos.
 * Sem este componente montado, nada muda (o projeto que não o monta não envia page_view).
 */
export function PageViewTracker({ exclude }: { exclude?: readonly string[] }) {
  const pathname = usePathname();
  const excludeKey = (exclude ?? PAGE_VIEW_EXCLUDE).join('|');

  useEffect(() => {
    if (!pathname) return;
    getSessionUtm();
    const prefixes = excludeKey.split('|').filter(Boolean);
    // Sem cancelar na troca de rota: a página vista conta mesmo se a pessoa sair antes do ocioso.
    whenIdle(() => sendPageView(pathname, { exclude: prefixes }));
  }, [pathname, excludeKey]);

  return null;
}
