// Montagem dos cards do <CategoryCarousel> a partir das linhas dos recursos públicos da taxonomia.
// Puro (sem React, sem 'use client'): o carrossel usa no navegador e um Server Component pode usar
// para já entregar os cards prontos no HTML (prop `items` do carrossel).

export type CategoryCarouselStatRow = {
  id: string | number;
  categoryId: string | number;
  categoryName?: string;
  categoryIcon?: string;
  categoryGroupId?: string | number | null;
  name?: string;
  qtd?: number;
};

export type CategoryCarouselListingRow = {
  id: string | number;
  categoryId: string | number;
  servicesCount?: number;
};

export type CategoryCarouselGroupRow = {
  id: string | number;
  name?: string;
  slug?: string;
  icon?: string | null;
  sortOrder?: number;
  active?: boolean;
};

export type CategoryCarouselFacetRow = {
  id: string | number;
  categoryId: string | number;
  groupIds?: Array<string | number>;
};

export type CategoryCarouselItem = {
  id: number;
  name: string;
  /** slug do grupo (só em `groupBy="group"`) */
  slug?: string;
  icon?: string | null;
  /** nº de subcategorias da categoria — ou, em `groupBy="group"`, nº de categorias do grupo */
  count: number;
};

/** Um card por categoria (com subcategoria ativa; com `onlyWithListings`, só as que têm anúncio). */
export function buildCategoryItems(
  stats: readonly CategoryCarouselStatRow[] | null | undefined,
  listings: readonly CategoryCarouselListingRow[] | null | undefined,
  onlyWithListings: boolean
): CategoryCarouselItem[] {
  const withListings = onlyWithListings
    ? new Set(
        (listings ?? [])
          .filter((r) => Number(r.servicesCount ?? 0) > 0)
          .map((r) => Number(r.categoryId)),
      )
    : null;
  const map = new Map<number, CategoryCarouselItem>();
  for (const row of stats ?? []) {
    const cid = Number(row.categoryId);
    if (!Number.isFinite(cid) || cid <= 0) continue;
    if (withListings && !withListings.has(cid)) continue;
    const name = String(row.categoryName ?? row.name ?? `Categoria ${cid}`);
    const icon = row.categoryIcon;
    const entry = map.get(cid) ?? { id: cid, name, icon, count: 0 };
    entry.count += 1;
    map.set(cid, entry);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

/**
 * Um card por grupo: conta as categorias de cada grupo ativo. Com `onlyWithListings`, usa as facetas
 * (grupo primário + vínculos extras das categorias com anúncio); senão, o grupo primário das
 * categorias com subcategoria ativa. Grupos sem categoria somem. Sem as facetas (banco sem a migração
 * search 0013, `facetsError`), cai no grupo primário das categorias com anúncio em vez de esvaziar.
 */
export function buildGroupItems({
  stats,
  groups,
  facets,
  facetsError,
  onlyWithListings,
  categoryItems,
}: {
  stats: readonly CategoryCarouselStatRow[] | null | undefined;
  groups: readonly CategoryCarouselGroupRow[] | null | undefined;
  facets: readonly CategoryCarouselFacetRow[] | null | undefined;
  facetsError: boolean;
  onlyWithListings: boolean;
  /** Saída de `buildCategoryItems` (as categorias com anúncio, no caminho sem facetas). */
  categoryItems: readonly CategoryCarouselItem[];
}): CategoryCarouselItem[] {
  const counts = new Map<number, Set<number>>();
  const add = (gid: unknown, cid: number) => {
    const g = Number(gid);
    if (!Number.isFinite(g) || g <= 0) return;
    const set = counts.get(g) ?? new Set<number>();
    set.add(cid);
    counts.set(g, set);
  };
  if (onlyWithListings && !facetsError) {
    for (const f of facets ?? []) {
      for (const gid of f.groupIds ?? []) add(gid, Number(f.categoryId));
    }
  } else if (onlyWithListings) {
    const withListings = new Set(categoryItems.map((c) => c.id));
    for (const row of stats ?? []) {
      const cid = Number(row.categoryId);
      if (withListings.has(cid)) add(row.categoryGroupId, cid);
    }
  } else {
    for (const row of stats ?? []) add(row.categoryGroupId, Number(row.categoryId));
  }
  return (groups ?? [])
    .filter((g) => g.active !== false && counts.has(Number(g.id)))
    .sort(
      (a, b) =>
        Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0) ||
        String(a.name ?? "").localeCompare(String(b.name ?? ""), "pt-BR"),
    )
    .map((g) => ({
      id: Number(g.id),
      name: String(g.name ?? `Grupo ${g.id}`),
      slug: g.slug ?? undefined,
      icon: g.icon ?? null,
      count: counts.get(Number(g.id))!.size,
    }));
}
