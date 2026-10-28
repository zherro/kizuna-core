'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchMapPlace, type MapPlaceDetail } from './map-api';

export type PlaceDetailState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'empty' }
  | { status: 'ready'; detail: MapPlaceDetail };

/**
 * Detalhe de um anúncio sob demanda: só busca quando `uid` existe (painel aberto) e guarda o
 * resultado por anúncio, inclusive "indisponível" (resposta vazia): abrir de novo o mesmo anúncio
 * não chama a RPC outra vez. Erro não fica no cache: `retry` tenta de novo.
 */
export function usePlaceDetail(uid: string | null, endpoint?: string) {
  const cache = useRef(new Map<string, MapPlaceDetail | null>());
  const [state, setState] = useState<PlaceDetailState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!uid) return;
    if (cache.current.has(uid)) {
      const hit = cache.current.get(uid) ?? null;
      setState(hit ? { status: 'ready', detail: hit } : { status: 'empty' });
      return;
    }
    const ctrl = new AbortController();
    setState({ status: 'loading' });
    fetchMapPlace(uid, ctrl.signal, endpoint)
      .then((detail) => {
        if (ctrl.signal.aborted) return;
        cache.current.set(uid, detail);
        setState(detail ? { status: 'ready', detail } : { status: 'empty' });
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setState({ status: 'error' });
      });
    return () => ctrl.abort();
  }, [uid, endpoint, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, retry };
}
