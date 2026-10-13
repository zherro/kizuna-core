'use client';

import { useCallback, useMemo, useState } from 'react';
import { useResourceOptions } from '../../../hooks';
import {
  buildFilterTaxonomy,
  type CategoryRow,
  type FilterTaxonomy,
  type GroupRow,
  type ListingRow,
  resolveListings,
  type StatRow,
} from './filter-taxonomy';

/**
 * Carrega a taxonomia do filtro (grupos, categorias, especialidades) pelos recursos públicos e
 * entrega `FilterTaxonomy` montada. Só `category_stats` é essencial (`category_service_stats` entra
 * apenas com `onlyWithListings`, e falha dele não esvazia nada): sem os grupos o painel cai numa
 * lista simples de categorias; sem `categories_public` perde só ícone e vínculos extras de grupo.
 */
export function useFilterTaxonomy({
  onlyWithListings = false,
  keepCategoryIds = [],
}: {
  /** só categorias/grupos com anúncio publicado (cruza `category_service_stats`) */
  onlyWithListings?: boolean;
  /** categorias que ficam mesmo sem anúncio (as marcadas na URL, p/ poder limpar) */
  keepCategoryIds?: number[];
} = {}): {
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

  // Fonte opcional: se falhar, o filtro segue sem a contagem (não esvazia).
  const listings = useResourceOptions<ListingRow & { id: string | number }>({
    resource: 'category_service_stats',
    pageSize: 1000,
    enabled: enabled && onlyWithListings,
  });

  const keepKey = keepCategoryIds.join(',');
  const taxonomy = useMemo(
    () =>
      buildFilterTaxonomy({
        groups: groups.options,
        categories: categories.options,
        stats: stats.options,
        listings: resolveListings({
          enabled: onlyWithListings,
          rows: listings.options,
          error: listings.error,
        }),
        keepCategoryIds,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups.options, categories.options, stats.options, listings.options, listings.error, onlyWithListings, keepKey]
  );

  // Recarrega desligando/ligando o `enabled` dos três recursos.
  const retry = useCallback(() => {
    setEnabled(false);
    setTimeout(() => setEnabled(true), 0);
  }, []);

  return {
    taxonomy,
    loading: !enabled || stats.loading || groups.loading || categories.loading || listings.loading,
    error: stats.error,
    retry,
  };
}
