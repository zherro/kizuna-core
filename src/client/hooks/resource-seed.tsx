'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * Listagem pública já carregada no SERVIDOR (`loadPublicResourceSeed`) e entregue à página como
 * prop, no lugar do fetch que o `useResourceOptions` faria no navegador depois de montar.
 * Mesmo formato de `GET /api/resources/{resource}?pageSize={pageSize}` (linhas já mapeadas).
 */
export type ResourceSeed = {
  resource: string;
  items: Array<{ id: string | number; [key: string]: unknown }>;
  /** `pageSize` pedido ao carregar (o servidor ainda corta em `maxPageSize` do recurso). */
  pageSize: number;
  /** `true` = veio a lista inteira (total <= linhas): serve para qualquer `pageSize` pedido. */
  complete: boolean;
};

const ResourceSeedContext = createContext<readonly ResourceSeed[]>([]);

/**
 * Entrega listagens públicas carregadas no servidor aos `useResourceOptions` abaixo dele (taxonomia
 * da busca, carrossel de categorias...). Sem provider, ou sem a semente do recurso, o hook busca
 * no navegador como sempre.
 */
export function ResourceSeedProvider({
  seeds,
  children,
}: {
  seeds: readonly (ResourceSeed | null | undefined)[];
  children: ReactNode;
}) {
  const parent = useContext(ResourceSeedContext);
  const own = seeds.filter((s): s is ResourceSeed => !!s);
  const value = own.length ? [...own, ...parent] : parent;
  return <ResourceSeedContext.Provider value={value}>{children}</ResourceSeedContext.Provider>;
}

/**
 * Escolhe a semente que responde EXATAMENTE a esta consulta: sem filtro, busca nem ordenação própria,
 * e com a lista completa (ou o mesmo `pageSize`). Qualquer outra consulta → `null` (vai à rede).
 */
export function pickResourceSeed(
  seeds: readonly ResourceSeed[],
  query: {
    resource: string;
    filter?: Record<string, unknown>;
    search?: string;
    orderBy?: string;
    pageSize?: number;
  }
): ResourceSeed['items'] | null {
  if (query.search?.trim() || query.orderBy) return null;
  if (query.filter && Object.keys(query.filter).length > 0) return null;
  const pageSize = query.pageSize ?? 1000;
  const seed = seeds.find(
    (s) =>
      s.resource === query.resource &&
      (s.complete ? s.items.length <= pageSize : s.pageSize === pageSize)
  );
  return seed ? seed.items : null;
}

export function useResourceSeeds(): readonly ResourceSeed[] {
  return useContext(ResourceSeedContext);
}
