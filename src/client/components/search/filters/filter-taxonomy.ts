/**
 * Taxonomia do filtro da busca (grupo > categoria > especialidade) — lógica PURA, sem React nem
 * fetch. O hook `useFilterTaxonomy` só entrega as linhas dos recursos; tudo que decide "o que
 * aparece e o que muda ao clicar" mora aqui, onde dá pra testar sem DOM.
 *
 * Fontes (recursos públicos de `screen-engine/resources/taxonomy.ts`):
 * - `categories_group_public` → grupos (id, name, slug, icon, sortOrder, active)
 * - `categories_public`       → categorias (icon, categoryGroupId, extraGroupIds, active)
 * - `category_stats`          → 1 linha por subcategoria ativa (categoryId, subcategoryId…)
 * - `category_service_stats`  → anúncios publicados por categoria (opcional — ver `listings`)
 *
 * Regra herdada do `CategoryCarousel`: só aparece categoria com ao menos uma subcategoria ativa.
 * Por isso a lista de categorias nasce das linhas de `category_stats` e `categories_public` só
 * enriquece (ícone e vínculos extras de grupo) — se ele falhar ou vier truncado, o filtro continua
 * funcionando com o grupo primário que a view já traz.
 */

import type { SearchFilterPatch } from '../search-types';

export type FilterGroup = {
  id: number;
  slug: string;
  name: string;
  icon: string | null;
};

export type FilterSubcategory = { id: number; name: string };

export type FilterCategory = {
  id: number;
  name: string;
  icon: string | null;
  /** grupo primário (`categories.category_group_id`) */
  groupId: number | null;
  /** ligações extras (`categories_group_link`) — a categoria também aparece nesses grupos */
  extraGroupIds: number[];
  subs: FilterSubcategory[];
};

export type FilterTaxonomy = {
  groups: FilterGroup[];
  categories: FilterCategory[];
};

export const EMPTY_TAXONOMY: FilterTaxonomy = { groups: [], categories: [] };

// ─── Linhas cruas dos recursos ─────────────────────────────────────────────────────────────

type Id = string | number | null | undefined;

export type GroupRow = {
  id: string | number;
  name?: string;
  slug?: string;
  icon?: string | null;
  sortOrder?: number;
  active?: boolean;
};

export type CategoryRow = {
  id: string | number;
  name?: string;
  icon?: string | null;
  categoryGroupId?: Id;
  extraGroupIds?: Id[];
  active?: boolean;
};

export type StatRow = {
  id?: string | number;
  categoryId?: Id;
  categoryName?: string;
  name?: string;
  categoryIcon?: string | null;
  categoryGroupId?: Id;
  subcategoryId?: Id;
  subcategoryName?: string | null;
};

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'pt-BR');

function toId(value: Id): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

function cleanIcon(value: string | null | undefined): string | null {
  const v = typeof value === 'string' ? value.trim() : '';
  return v || null;
}

// ─── Montagem ──────────────────────────────────────────────────────────────────────────────

/** Linha de `category_service_stats` (anúncios publicados e não vencidos por categoria). */
export type ListingRow = {
  categoryId?: Id;
  servicesCount?: number | string | null;
  /** subcategorias com anúncio vivo (`vw_category_service_stats.subcategory_ids`) */
  subcategoryIds?: Id[] | null;
  /** grupo primário e grupos (primário + extras) da categoria */
  categoryGroupId?: Id;
  groupIds?: Id[] | null;
};

/**
 * Decide se a contagem de anúncios entra no filtro: só com a flag ligada E a fonte sem erro.
 * Falha da contagem devolve `null` (não filtra) — nunca esvazia o painel por causa dela.
 */
export function resolveListings(input: {
  enabled: boolean;
  rows: ListingRow[] | null | undefined;
  error?: string | null;
}): ListingRow[] | null {
  if (!input.enabled || input.error || !input.rows) return null;
  return input.rows;
}

/**
 * Junta as facetas (subcategorias/grupos da migração 0013) à contagem por categoria. Facetas
 * ausentes ou com erro → as linhas seguem como estão (sem filtrar subcategorias).
 */
export function mergeListingFacets(
  rows: ListingRow[] | null,
  facets: ListingRow[] | null | undefined
): ListingRow[] | null {
  if (!rows || !facets || facets.length === 0) return rows;
  const byCategory = new Map<number, ListingRow>();
  for (const f of facets) {
    const id = toId(f.categoryId);
    if (id !== null) byCategory.set(id, f);
  }
  return rows.map((r) => {
    const f = byCategory.get(toId(r.categoryId) ?? -1);
    return f
      ? {
          ...r,
          subcategoryIds: f.subcategoryIds,
          categoryGroupId: f.categoryGroupId,
          groupIds: f.groupIds,
        }
      : r;
  });
}

export function buildFilterTaxonomy(input: {
  groups?: GroupRow[] | null;
  categories?: CategoryRow[] | null;
  stats?: StatRow[] | null;
  /**
   * Contagem de anúncios por categoria. Presente → descarta categoria sem anúncio (e, por
   * consequência, o grupo que ficou sem categoria). `null`/ausente (flag desligada ou fonte
   * falhou) → não filtra: o filtro nunca esvazia por falha da contagem.
   */
  listings?: ListingRow[] | null;
  /** Categorias que continuam na lista mesmo sem anúncio (as marcadas na URL, p/ poder limpar). */
  keepCategoryIds?: number[];
}): FilterTaxonomy {
  const groups: FilterGroup[] = [];
  const seenGroups = new Set<number>();
  const groupOrder = new Map<number, number>();
  for (const row of input.groups ?? []) {
    const id = toId(row.id);
    const slug = String(row.slug ?? '').trim();
    if (id === null || !slug || row.active === false || seenGroups.has(id)) continue;
    seenGroups.add(id);
    groupOrder.set(id, Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : 0);
    groups.push({
      id,
      slug,
      name: String(row.name ?? '').trim() || slug.replace(/-/g, ' '),
      icon: cleanIcon(row.icon),
    });
  }
  groups.sort(
    (a, b) => (groupOrder.get(a.id) ?? 0) - (groupOrder.get(b.id) ?? 0) || byName(a, b)
  );

  // Enriquecimento vindo de `categories_public`.
  const extra = new Map<number, CategoryRow>();
  for (const row of input.categories ?? []) {
    const id = toId(row.id);
    if (id !== null) extra.set(id, row);
  }

  // categoria com anúncio → subcategorias com anúncio (null = a fonte não informou: não filtra) e grupos
  const withListings = input.listings ? new Map<number, ListingRow>() : null;
  for (const r of input.listings ?? []) {
    const id = toId(r.categoryId);
    if (id !== null && Number(r.servicesCount ?? 0) > 0) withListings!.set(id, r);
  }
  const keep = new Set(input.keepCategoryIds ?? []);

  const categories = new Map<number, FilterCategory>();
  for (const row of input.stats ?? []) {
    const categoryId = toId(row.categoryId);
    if (categoryId === null) continue;
    if (withListings && !withListings.has(categoryId) && !keep.has(categoryId)) continue;
    const enrich = extra.get(categoryId);
    if (enrich?.active === false) continue;

    let entry = categories.get(categoryId);
    if (!entry) {
      const listed = withListings?.get(categoryId);
      const groupId =
        toId(enrich?.categoryGroupId) ?? toId(row.categoryGroupId) ?? toId(listed?.categoryGroupId);
      entry = {
        id: categoryId,
        name:
          String(row.categoryName ?? row.name ?? enrich?.name ?? '').trim() ||
          `Categoria ${categoryId}`,
        icon: cleanIcon(enrich?.icon) ?? cleanIcon(row.categoryIcon),
        groupId,
        extraGroupIds: [
          ...new Set(
            (enrich?.extraGroupIds ?? listed?.groupIds ?? [])
              .map(toId)
              .filter((g): g is number => g !== null && g !== groupId)
          ),
        ],
        subs: [],
      };
      categories.set(categoryId, entry);
    }

    const subId = toId(row.subcategoryId);
    const subName = String(row.subcategoryName ?? '').trim();
    // só subcategoria com anúncio vivo (quando a fonte informa a lista)
    const liveSubs = withListings?.get(categoryId)?.subcategoryIds;
    if (liveSubs && !liveSubs.some((x) => toId(x) === subId)) continue;
    if (subId !== null && subName && !entry.subs.some((s) => s.id === subId)) {
      entry.subs.push({ id: subId, name: subName });
    }
  }

  // categoria com anúncio mas sem subcategoria marcada continua navegável (só sem chips)
  const list = [...categories.values()].filter(
    (c) => c.subs.length > 0 || (withListings?.has(c.id) ?? false)
  );
  for (const c of list) c.subs.sort(byName);
  list.sort(byName);
  return { groups, categories: list };
}

// ─── Consultas ─────────────────────────────────────────────────────────────────────────────

export function findGroupBySlug(t: FilterTaxonomy, slug: string | null | undefined): FilterGroup | null {
  if (!slug) return null;
  return t.groups.find((g) => g.slug === slug) ?? null;
}

export function findCategory(t: FilterTaxonomy, id: number): FilterCategory | null {
  return t.categories.find((c) => c.id === id) ?? null;
}

/** Categorias que pertencem ao grupo: o primário OU uma ligação extra. */
export function categoriesOfGroup(t: FilterTaxonomy, groupId: number): FilterCategory[] {
  return t.categories.filter((c) => c.groupId === groupId || c.extraGroupIds.includes(groupId));
}

/** Grupos que têm ao menos uma categoria navegável (os vazios seriam beco sem saída na lista). */
export function groupsWithCategories(t: FilterTaxonomy): FilterGroup[] {
  return t.groups.filter((g) => categoriesOfGroup(t, g.id).length > 0);
}

/**
 * Grupo em vigor na EXIBIÇÃO: o `groupSlug` da URL; sem ele, o grupo primário da primeira categoria
 * marcada (usuário que veio do carrossel com `?categoryId=`). Nada disso é gravado na URL.
 */
export function resolveActiveGroup(
  t: FilterTaxonomy,
  filters: { groupSlug: string | null; categoryIds: number[] }
): { group: FilterGroup | null; deduced: boolean } {
  const explicit = findGroupBySlug(t, filters.groupSlug);
  if (explicit) return { group: explicit, deduced: false };
  for (const id of filters.categoryIds) {
    const category = findCategory(t, id);
    // grupo primário; categoria só ligada por vínculo extra usa o primeiro vínculo
    const groupId = category?.groupId ?? category?.extraGroupIds[0] ?? null;
    const group = groupId !== null ? (t.groups.find((g) => g.id === groupId) ?? null) : null;
    if (group) return { group, deduced: true };
  }
  return { group: null, deduced: false };
}

/** Marcados primeiro (mantendo a ordem relativa de cada metade). */
export function selectedFirst<T extends { id: number }>(items: T[], selectedIds: number[]): T[] {
  const on = new Set(selectedIds);
  return [...items.filter((i) => on.has(i.id)), ...items.filter((i) => !on.has(i.id))];
}

export type SubcategoryBlock = {
  category: { id: number; name: string };
  subs: FilterSubcategory[];
};

/** Especialidades das categorias marcadas (um bloco por categoria, marcadas primeiro). */
export function subcategoryBlocks(
  t: FilterTaxonomy,
  categoryIds: number[],
  subcategoryIds: number[]
): SubcategoryBlock[] {
  const blocks: SubcategoryBlock[] = [];
  for (const id of categoryIds) {
    const category = findCategory(t, id);
    if (!category || category.subs.length === 0) continue;
    blocks.push({
      category: { id: category.id, name: category.name },
      subs: selectedFirst(category.subs, subcategoryIds),
    });
  }
  return blocks;
}

// ─── Mudanças (viram `setFilters(patch)`) ──────────────────────────────────────────────────

/** Marca/desmarca a categoria; desmarcar leva junto as especialidades dela. */
export function toggleCategory(
  t: FilterTaxonomy,
  current: { categoryIds: number[]; subcategoryIds: number[] },
  id: number
): { categoryIds: number[]; subcategoryIds: number[] } {
  if (!current.categoryIds.includes(id)) {
    return {
      categoryIds: [...current.categoryIds, id],
      subcategoryIds: [...current.subcategoryIds],
    };
  }
  const owned = new Set((findCategory(t, id)?.subs ?? []).map((s) => s.id));
  return {
    categoryIds: current.categoryIds.filter((c) => c !== id),
    subcategoryIds: current.subcategoryIds.filter((s) => !owned.has(s)),
  };
}

export function toggleSubcategory(subcategoryIds: number[], id: number): number[] {
  return subcategoryIds.includes(id)
    ? subcategoryIds.filter((s) => s !== id)
    : [...subcategoryIds, id];
}

/** Trocar de grupo (ou limpar com `null`) zera categorias e especialidades. */
export function groupChangePatch(slug: string | null): SearchFilterPatch {
  return { groupSlug: slug, categoryIds: [], subcategoryIds: [] };
}

/** Texto curto do `aria-live`: "3 filtros aplicados". */
export function summarizeActiveFilters(count: number): string {
  if (count <= 0) return 'Nenhum filtro aplicado';
  return count === 1 ? '1 filtro aplicado' : `${count} filtros aplicados`;
}
