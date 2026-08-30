'use client';

import { useEffect, useState } from 'react';
import { fetchResourceList, ResourceFetchError } from './shared/fetch-resource';

export type ResourceOption = { id: string | number; name?: string; [key: string]: any };

type UseResourceOptionsOptions = {
  resource: string;
  labelField?: string;
  filter?: Record<string, string | number | boolean>;
};

export function useResourceOptions<T extends ResourceOption>({
  resource,
  labelField = 'name',
  filter,
}: UseResourceOptionsOptions) {
  const [options, setOptions] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const rows = await fetchResourceList(resource, filter, 'Erro ao carregar opções');
        setOptions(rows as T[]);
      } catch (err) {
        setError(err instanceof ResourceFetchError ? err.message : 'Erro de conexão');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [resource, labelField, filter]);

  return {
    options,
    loading,
    error,
    getLabel: (option: T) => {
      return String(option[labelField] || option.id);
    },
  };
}
