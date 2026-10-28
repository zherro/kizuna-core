'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchMapPins, mergePins, needsRefetch, type MapPinRow, type SearchArea } from './map-api';

export const PINS_DEBOUNCE_MS = 400;

/**
 * Pinos por raio: quando a área visível (`area`) para de mudar por `debounceMs` e o centro andou
 * mais de 30% do raio (ou o raio cresceu além do já buscado), busca de novo. Cancela a busca
 * anterior, junta os pinos num cache em memória (por `uid:address_id`, teto de 400) e nunca
 * derruba o mapa: erro vira `error` e os pinos já carregados continuam. `area === null` (quadro
 * ainda sem tamanho) não busca nada.
 */
export function useMapPins(
  area: SearchArea | null,
  { debounceMs = PINS_DEBOUNCE_MS, endpoint }: { debounceMs?: number; endpoint?: string } = {}
) {
  const cache = useRef(new Map<string, MapPinRow>());
  const searched = useRef<SearchArea | null>(null);
  const controller = useRef<AbortController | null>(null);
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const lat = area?.lat;
  const lng = area?.lng;
  const radiusKm = area?.radiusKm;

  useEffect(() => {
    if (lat === undefined || lng === undefined || radiusKm === undefined) return;
    const next: SearchArea = { lat, lng, radiusKm };
    const timer = setTimeout(() => {
      if (!needsRefetch(searched.current, next)) return;
      controller.current?.abort();
      const ctrl = new AbortController();
      controller.current = ctrl;
      searched.current = next;
      setLoading(true);
      // Raio arredondado para cima (0,1 km): a rota aceita 0,1 a 100.
      const query = { lat: next.lat, lng: next.lng, radiusKm: Math.ceil(next.radiusKm * 10) / 10 };
      fetchMapPins(query, ctrl.signal, endpoint)
        .then((rows) => {
          if (ctrl.signal.aborted) return;
          cache.current = mergePins(cache.current, rows, next);
          setVersion((v) => v + 1);
          setError(false);
          setLoaded(true);
          setLoading(false);
        })
        .catch(() => {
          if (ctrl.signal.aborted) return;
          // Esquece a área para a próxima movimentação tentar de novo.
          searched.current = null;
          setError(true);
          setLoading(false);
        });
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [lat, lng, radiusKm, debounceMs, endpoint]);

  useEffect(() => () => controller.current?.abort(), []);

  const pins = useMemo(() => [...cache.current.values()], [version]); // eslint-disable-line react-hooks/exhaustive-deps
  return { pins, loading, error, loaded };
}
