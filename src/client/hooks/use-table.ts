'use client';

import { useEffect, useCallback, useState, type ChangeEvent, type FormEvent } from 'react';

export type TableOrderDirection = 'asc' | 'desc';

export type ResourceListResponse<TItem> = {
  items: TItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type UseTableOptions = {
  resource: string;
  endpoint?: string;
  pageSize?: number;
  orderBy?: string;
  orderDirection?: TableOrderDirection;
  filters?: Record<string, string | number | boolean | null | undefined>;
  initialSearch?: string;
  listOnLoad?: boolean;
};

export type UseTableResult<TItem> = {
  items: TItem[];
  setItems: (items: TItem[]) => void;
  loading: boolean;
  error: string;
  setError: (message: string) => void;
  clearError: () => void;
  search: string;
  setSearch: (value: string) => void;
  searchInputProps: {
    value: string;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  };
  searchFormProps: {
    onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  };
  page: number;
  total: number;
  totalPages: number;
  pageSize: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  load: (targetPage: number, searchTerm: string) => Promise<void>;
  goToPage: (targetPage: number) => Promise<void>;
  refresh: () => Promise<void>;
  submitSearch: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function useTable<TItem>({
  resource,
  endpoint,
  pageSize: configuredPageSize = 8,
  orderBy = 'name',
  orderDirection = 'asc',
  filters,
  initialSearch = '',
  listOnLoad = true,
}: UseTableOptions) {
  const [items, setItems] = useState<TItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const clearError = useCallback(() => {
    setError('');
  }, []);

  const load = useCallback(
    async (targetPage: number, searchTerm: string) => {
      setLoading(true);
      try {
        const query = new URLSearchParams({
          page: String(targetPage),
          pageSize: String(configuredPageSize),
          orderBy,
          orderDirection,
        });

        if (searchTerm.trim()) {
          query.set('search', searchTerm.trim());
        }

        if (filters) {
          for (const [field, value] of Object.entries(filters)) {
            if (value === undefined || value === null || value === '') continue;
            query.set(`filter.${field}`, String(value));
          }
        }

        const basePath = endpoint ?? `/api/resources/${resource}`;
        const response = await fetch(`${basePath}?${query.toString()}`, {
          cache: 'no-store',
        });

        const data =
          ((await response.json().catch(() => null)) as
            | (Partial<ResourceListResponse<TItem>> & { message?: string })
            | null) ?? null;

        if (!response.ok) {
          setError(data?.message || 'Nao foi possivel carregar os registros.');
          return;
        }

        const loadedItems = Array.isArray(data?.items) ? data.items : [];
        const loadedPage = typeof data?.page === 'number' ? data.page : targetPage;
        const rawTotal = typeof data?.total === 'number' ? data.total : 0;
        const total =
          loadedItems.length < configuredPageSize
            ? (loadedPage - 1) * configuredPageSize + loadedItems.length
            : Math.max(rawTotal, loadedItems.length);

        setItems(loadedItems);
        setPage(loadedPage);
        setTotal(total);
        setTotalPages(Math.ceil(total / configuredPageSize));
      } catch {
        setError('Erro de conexao com o servidor.');
      } finally {
        setLoading(false);
      }
    },
    [resource, endpoint, configuredPageSize, orderBy, orderDirection, filters]
  );

  const goToPage = useCallback(
    async (targetPage: number) => {
      await load(targetPage, search);
    },
    [load, search]
  );

  const refresh = useCallback(() => {
    return load(page, search);
  }, [load, page, search]);

  const submitSearch = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await load(1, search);
    },
    [load, search]
  );

  useEffect(() => {
    if (listOnLoad) {
      load(1, initialSearch);
    }
  }, []);

  return {
    items,
    setItems,
    loading,
    error,
    setError,
    clearError,
    search,
    setSearch,
    searchInputProps: {
      value: search,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value),
    },
    searchFormProps: {
      onSubmit: submitSearch,
    },
    page,
    total,
    totalPages,
    pageSize: configuredPageSize,
    canGoPrevious: page > 1,
    canGoNext: page < totalPages,
    load,
    goToPage,
    refresh,
    submitSearch,
  };
}
