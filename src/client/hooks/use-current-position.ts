'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type PositionStatus = 'idle' | 'asking' | 'granted' | 'denied' | 'unavailable';
export type CurrentPosition = { lat: number; lng: number; accuracy: number | null };

const GEOLOCATION_PERMISSION_DENIED = 1;

/**
 * Coordenadas do aparelho (precisão padrão; pode vir de até 1 min atrás), pedidas só quando `request()` é chamado (em resposta a um clique —
 * nunca ao montar). Diferente de `useUserLocation`, que resolve cidade/UF e persiste para filtrar
 * o site: aqui as coordenadas ficam só em memória, nunca vão para `localStorage`, servidor ou
 * analytics. Sem a API, negado ou com falha: o consumidor segue sem posição.
 */
export function useCurrentPosition() {
  const [status, setStatus] = useState<PositionStatus>('idle');
  const [position, setPosition] = useState<CurrentPosition | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const request = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable');
      return;
    }
    setStatus('asking');
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!mounted.current) return;
          setPosition({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy ?? null,
          });
          setStatus('granted');
        },
        (err) => {
          if (!mounted.current) return;
          setPosition(null);
          setStatus(err.code === GEOLOCATION_PERMISSION_DENIED ? 'denied' : 'unavailable');
        },
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 }
      );
    } catch {
      // Lançamento síncrono (ex.: SecurityError em contexto embutido): segue sem posição.
      setPosition(null);
      setStatus('unavailable');
    }
  }, []);

  return { status, position, request };
}
