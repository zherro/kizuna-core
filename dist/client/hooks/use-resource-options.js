'use client';
import { useEffect, useRef, useState } from 'react';
import { fetchResourceList, ResourceFetchError } from './shared/fetch-resource';
export function useResourceOptions({ resource, labelField = 'name', filter, pageSize, search, orderBy, }) {
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // Debounce só do termo de busca — resource/filter/pageSize aplicam na hora.
    const [debouncedSearch, setDebouncedSearch] = useState(search ?? '');
    useEffect(() => {
        const term = search ?? '';
        if (term === debouncedSearch)
            return;
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
                if (requestId !== latestRequest.current)
                    return;
                setOptions(rows);
                setError('');
            }
            catch (err) {
                if (requestId !== latestRequest.current)
                    return;
                setError(err instanceof ResourceFetchError ? err.message : 'Erro de conexão');
            }
            finally {
                if (requestId === latestRequest.current)
                    setLoading(false);
            }
        }
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resource, labelField, filterKey, pageSize, debouncedSearch, orderBy]);
    return {
        options,
        loading,
        error,
        getLabel: (option) => {
            return String(option[labelField] || option.id);
        },
    };
}
//# sourceMappingURL=use-resource-options.js.map