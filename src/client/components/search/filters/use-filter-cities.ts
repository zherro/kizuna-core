'use client';

import { useEffect, useState } from 'react';
import { loadCities, type CityOption } from './filter-cities';

/** Catálogo de cidades do filtro. Uma requisição por página (cache em módulo, ver `loadCities`). */
export function useFilterCities(): { cities: CityOption[]; loading: boolean; error: boolean } {
  const [cities, setCities] = useState<CityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    loadCities()
      .then((items) => {
        if (!alive) return;
        setCities(items);
        setError(false);
      })
      .catch(() => {
        if (alive) setError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { cities, loading, error };
}
