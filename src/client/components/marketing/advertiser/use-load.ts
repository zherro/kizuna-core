'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

export type Loaded<T> = { data: T | null; loading: boolean; error: string | null; reload: () => void };

/** Carrega ao montar e quando `reload()` é chamado. Sem cache; ignora resposta de carga antiga. */
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []): Loaded<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const seq = useRef(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    const mine = ++seq.current;
    setLoading(true);
    setError(null);
    loaderRef
      .current()
      .then((d) => {
        if (mine === seq.current) setData(d);
      })
      .catch((e: unknown) => {
        if (mine === seq.current) setError(e instanceof Error ? e.message : 'Falha ao carregar.');
      })
      .finally(() => {
        if (mine === seq.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload };
}
