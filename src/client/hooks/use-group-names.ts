'use client';

import { useEffect, useState } from 'react';
import { fetchResourceList } from './shared/fetch-resource';

type GroupNames = Record<string, string>;

// Uma busca por página: vários carrosséis (home, "veja também") dividem a mesma promessa.
let pending: Promise<GroupNames> | null = null;

function loadGroupNames(): Promise<GroupNames> {
  pending ??= fetchResourceList('categories_group_public', undefined, 'Erro ao carregar grupos', { pageSize: 100 })
    .then((rows) => {
      const names: GroupNames = {};
      for (const row of rows as { slug?: string; name?: string }[]) {
        if (row.slug && row.name) names[row.slug] = row.name;
      }
      return names;
    })
    .catch(() => {
      pending = null; // falha silenciosa: o card fica só com a categoria; tenta de novo na próxima
      return {};
    });
  return pending;
}

/** Nome do grupo de categorias pelo slug (`category_group_slug`), para o selo dos cards. */
export function useGroupNames(): (slug: string | null | undefined) => string | null {
  const [names, setNames] = useState<GroupNames>({});
  useEffect(() => {
    let alive = true;
    loadGroupNames().then((n) => alive && setNames(n));
    return () => {
      alive = false;
    };
  }, []);
  return (slug) => (slug ? names[slug] ?? null : null);
}
