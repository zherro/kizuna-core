'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchResourceList, ResourceFetchError } from './shared/fetch-resource';

export type ResourceOption = { id: string | number; name?: string; [key: string]: any };

type UseResourceOptionsOptions = {
  resource: string;
  labelField?: string;
  filter?: Record<string, string | number | boolean>;
  /**
   * Teto de linhas trazidas do server. Default 1000. Para recursos que podem crescer muito
   * (`categories`, `funcoes`), prefira baixar isto e usar `search` para o usuário filtrar.
   */
  pageSize?: number;
  /**
   * Termo de busca server-side (`ilike` sobre as `searchableColumns` do recurso). Debounced
   * internamente (250 ms) — passe o texto cru do input direto.
   */
  search?: string;
  /** Coluna de ordenação (default: ordem padrão do recurso no server). */
  orderBy?: string;
};

export function useResourceOptions<T extends ResourceOption>({
  resource,
  labelField = 'name',
  filter,
  pageSize,
  search,
  orderBy,
}: UseResourceOptionsOptions) {
  const [options, setOptions] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Debounce só do termo de busca — resource/filter/pageSize aplicam na hora.
  const [debouncedSearch, setDebouncedSearch] = useState(search ?? '');
  useEffect(() => {
    const term = search ?? '';
    if (term === debouncedSearch) return;
    const timer = setTimeout(() => setDebouncedSearch(term), 250);
    return () => clearTimeout(timer);
  }, [search, debouncedSearch]);

  const filterKey = filter ? JSON.stringify(filter) : '';
  const latestRequest = useRef(0);

  useEffect(() => {
    const requestId = ++latestRequest.current;
    setLoading(true);

    async function load() {
      try {
        const rows = await fetchResourceList(resource, filter, 'Erro ao carregar opções', {
          pageSize,
          search: debouncedSearch,
          orderBy,
        });
        // Ignora respostas de requests já superados (troca rápida de termo).
        if (requestId !== latestRequest.current) return;
        setOptions(rows as T[]);
        setError('');
      } catch (err) {
        if (requestId !== latestRequest.current) return;
        setError(err instanceof ResourceFetchError ? err.message : 'Erro de conexão');
      } finally {
        if (requestId === latestRequest.current) setLoading(false);
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource, labelField, filterKey, pageSize, debouncedSearch, orderBy]);

  return {
    options,
    loading,
    error,
    getLabel: (option: T) => {
      return String(option[labelField] || option.id);
    },
  };
}
