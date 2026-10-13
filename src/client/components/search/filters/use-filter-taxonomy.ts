'use client';

import { useCallback, useMemo, useState } from 'react';
import { useResourceOptions } from '../../../hooks';
import {
  buildFilterTaxonomy,
  type CategoryRow,
  type FilterTaxonomy,
  type GroupRow,
  type StatRow,
} from './filter-taxonomy';

/**
 * Carrega a taxonomia do filtro (grupos, categorias, especialidades) pelos recursos públicos e
 * entrega `FilterTaxonomy` montada. Só `category_stats` é essencial: sem os grupos o painel cai numa
 * lista simples de categorias; sem `categories_public` perde só ícone e vínculos extras de grupo.
 */
export function useFilterTaxonomy(): {
  taxonomy: FilterTaxonomy;
  loading: boolean;
  /** só vale quando a taxonomia NÃO carregou (falha das fontes opcionais é silenciosa) */
  error: string;
  retry: () => void;
} {
  const [enabled, setEnabled] = useState(true);

  const stats = useResourceOptions<StatRow & { id: string | number }>({
    resource: 'category_stats',
    pageSize: 1000,
    enabled,
  });
  const groups = useResourceOptions<GroupRow>({
    resource: 'categories_group_public',
    pageSize: 100,
    enabled,
  });
  const categories = useResourceOptions<CategoryRow>({
    resource: 'categories_public',
    pageSize: 1000,
    enabled,
  });

  const taxonomy = useMemo(
    () =>
      buildFilterTaxonomy({
        groups: groups.options,
        categories: categories.options,
        stats: stats.options,
      }),
    [groups.options, categories.options, stats.options]
  );

  // Recarrega desligando/ligando o `enabled` dos três recursos.
  const retry = useCallback(() => {
    setEnabled(false);
    setTimeout(() => setEnabled(true), 0);
  }, []);

  return {
    taxonomy,
    loading: !enabled || stats.loading || groups.loading || categories.loading,
    error: stats.error,
    retry,
  };
}
