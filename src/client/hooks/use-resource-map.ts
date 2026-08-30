'use client';

import { useEffect, useState } from 'react';
import { fetchResourceList, ResourceFetchError } from './shared/fetch-resource';

export type ResourceMapEntry = {
  /** Key em `postgrestResources` — nome do resource, nunca hardcoded pelo hook. */
  resource: string;
  filter?: Record<string, string | number | boolean>;
  /** Cada item copia o campo `from` do registro cru pro campo `to` do resultado mesclado. */
  map: Array<{ from: string; to: string }>;
};

export type UseResourceMapResult = {
  /** Populado incrementalmente — cada entry escreve seu(s) campo(s) assim que responde, não
   * espera as outras entries. Um bloco pode ler `data.categorias` já preenchido enquanto
   * `data.grupos` ainda está undefined. */
  data: Record<string, unknown>;
  /** true enquanto QUALQUER entry ainda está em voo — use `pendingResources` se precisar saber
   * qual campo especificamente ainda não chegou, em vez de esconder a tela inteira. */
  loading: boolean;
  pendingResources: string[];
  errors: Record<string, string>;
};

/**
 * Orquestra N fetches de resource em paralelo (cada um via `fetchResourceList`, mesmo padrão de
 * `useResourceOptions`) e mescla o resultado no shape que um bloco bespoke consome — sem grafo de
 * dependência: pra um combobox filtrado pelo valor de outro, use `useResourceOptions` reagindo a
 * um `filter` que muda.
 *
 * Renderização progressiva, nunca "esperar todo mundo": cada entry resolve e escreve sua fatia de
 * `data` assim que responde — nunca um único `Promise.all(...).then(setData)` monolítico que só
 * libera quando a entry mais lenta termina.
 */
export function useResourceMap(entries: ResourceMapEntry[]): UseResourceMapResult {
  const [data, setData] = useState<Record<string, unknown>>({});
  const [pending, setPending] = useState<string[]>(() => entries.map((e) => e.resource));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const key = JSON.stringify(entries);

  useEffect(() => {
    let cancelled = false;
    setData({});
    setErrors({});
    setPending(entries.map((e) => e.resource));

    // Fetches independentes — cada .then() escreve sua fatia assim que responde, sem esperar as
    // outras (nada de Promise.all aqui: isso reintroduziria a espera que motivou este hook).
    entries.forEach((entry) => {
      fetchResourceList(entry.resource, entry.filter, 'Erro ao carregar dados.')
        .then((rows) => {
          if (cancelled) return;
          setData((prev) => {
            const next = { ...prev };
            for (const { from, to } of entry.map) {
              next[to] = rows.map((row) => row[from]);
            }
            return next;
          });
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          const message =
            err instanceof ResourceFetchError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Erro ao carregar dados.';
          setErrors((prev) => ({ ...prev, [entry.resource]: message }));
        })
        .finally(() => {
          if (cancelled) return;
          setPending((prev) => prev.filter((r) => r !== entry.resource));
        });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, loading: pending.length > 0, pendingResources: pending, errors };
}
