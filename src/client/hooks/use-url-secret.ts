'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Segredo que chega por link de e-mail (`/rota#chave=valor`; aceita `?chave=` de links antigos).
 * Ao montar: lê, guarda no `sessionStorage` (sobrevive a uma ida ao login e volta) e TIRA da URL
 * com `history.replaceState` — não fica no histórico, nem é copiado junto com o endereço.
 * `ready` = já leu (no servidor/1º render ainda não dá para saber se há segredo).
 * `clear()` apaga o guardado depois de usado.
 */
export function useUrlSecret(key: string): { value: string; ready: boolean; clear: () => void } {
  const storageKey = `kz-url-secret:${key}`;
  const [value, setValue] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const fromHash = new URLSearchParams(url.hash.replace(/^#/, '')).get(key);
    const fromQuery = url.searchParams.get(key);
    const fromUrl = fromHash || fromQuery;

    if (fromUrl) {
      try {
        sessionStorage.setItem(storageKey, fromUrl);
      } catch {
        // sem storage (modo privado restrito): segue só com o valor em memória
      }
      url.searchParams.delete(key);
      url.hash = '';
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`);
      setValue(fromUrl);
    } else {
      try {
        setValue(sessionStorage.getItem(storageKey) ?? '');
      } catch {
        setValue('');
      }
    }
    setReady(true);
  }, [key, storageKey]);

  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    setValue('');
  }, [storageKey]);

  return { value, ready, clear };
}
