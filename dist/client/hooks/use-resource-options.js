'use client';
import { useEffect, useState } from 'react';
import { fetchResourceList, ResourceFetchError } from './shared/fetch-resource';
export function useResourceOptions({ resource, labelField = 'name', filter, }) {
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    useEffect(() => {
        async function load() {
            try {
                const rows = await fetchResourceList(resource, filter, 'Erro ao carregar opções');
                setOptions(rows);
            }
            catch (err) {
                setError(err instanceof ResourceFetchError ? err.message : 'Erro de conexão');
            }
            finally {
                setLoading(false);
            }
        }
        load();
    }, [resource, labelField, filter]);
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