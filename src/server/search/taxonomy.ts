/**
 * Carrega e formata a taxonomia (grupos → categorias → subcategorias) para o prompt do
 * `search-agent`, e valida o filtro proposto pela IA contra ela.
 *
 * Estratégia de 2 estágios (economia de tokens): a 1ª chamada manda só grupos + categorias; só
 * quando a IA já escolheu uma categoria a 2ª chamada inclui as subcategorias daquela categoria.
 */

import { pgrstTable } from '../postrest/conn';
import type {
  AgentFilter,
  TaxonomyCategory,
  TaxonomyGroup,
  TaxonomySnapshot,
} from '../../client/components/search/search-types';

const TTL_MS = 10 * 60 * 1000;
let cache: TaxonomySnapshot | null = null;

async function pgrstPublicJson<T>(path: string): Promise<T[]> {
  const res = await pgrstTable(path, { headers: { 'Accept-Profile': 'public' } }, { auth: null });
  if (!res.ok) {
    throw new Error(`PostgREST ${res.status} em ${path}: ${await res.text().catch(() => '')}`);
  }
  const data = (await res.json().catch(() => null)) as T[] | null;
  return Array.isArray(data) ? data : [];
}

type GroupRow = { slug: string | null; name: string | null };
type CategoryRow = { id: number | string; name: string | null };
type StatsRow = {
  category_id: number | string;
  category_name: string | null;
  subcategory_id: number | string | null;
  subcategory_name: string | null;
};

/** Snapshot da taxonomia com cache em memória do processo (TTL 10 min). */
export async function loadTaxonomySnapshot(force = false): Promise<TaxonomySnapshot> {
  if (!force && cache && Date.now() - cache.loadedAt < TTL_MS) return cache;

  const [groupRows, categoryRows, statsRows] = await Promise.all([
    pgrstPublicJson<GroupRow>('/categories_group?select=slug,name&active=is.true&order=name'),
    pgrstPublicJson<CategoryRow>('/categories?select=id,name&active=is.true&order=name'),
    pgrstPublicJson<StatsRow>(
      '/vw_category_subcategory_stats?select=category_id,category_name,subcategory_id,subcategory_name&order=category_name'
    ),
  ]);

  const groups: TaxonomyGroup[] = groupRows
    .filter((g) => g.slug && g.name)
    .map((g) => ({ slug: String(g.slug), name: String(g.name) }));

  const byId = new Map<number, TaxonomyCategory>();
  for (const row of categoryRows) {
    const id = Number(row.id);
    if (!Number.isFinite(id) || id <= 0) continue;
    byId.set(id, { id, name: String(row.name ?? `Categoria ${id}`), subcategories: [] });
  }
  for (const row of statsRows) {
    const catId = Number(row.category_id);
    if (!Number.isFinite(catId) || catId <= 0) continue;
    let cat = byId.get(catId);
    if (!cat) {
      cat = {
        id: catId,
        name: String(row.category_name ?? `Categoria ${catId}`),
        subcategories: [],
      };
      byId.set(catId, cat);
    }
    const subId = Number(row.subcategory_id);
    if (Number.isFinite(subId) && subId > 0 && row.subcategory_name) {
      if (!cat.subcategories.some((s) => s.id === subId)) {
        cat.subcategories.push({ id: subId, name: String(row.subcategory_name) });
      }
    }
  }

  const categories = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  cache = { groups, categories, loadedAt: Date.now() };
  return cache;
}

/**
 * Texto da taxonomia para injetar no prompt.
 * - `categoryId == null` → estágio 1: só grupos + categorias.
 * - `categoryId != null` → estágio 2: grupos + categorias + subcategorias daquela categoria.
 */
export function formatTaxonomyForPrompt(
  snap: TaxonomySnapshot,
  opts: { categoryId: number | null }
): string {
  const lines: string[] = [];

  lines.push('GRUPOS (use o slug em groupSlug):');
  for (const g of snap.groups) lines.push(`- ${g.slug}: ${g.name}`);

  lines.push('', 'CATEGORIAS (use o id em categoryId):');
  for (const c of snap.categories) lines.push(`- ${c.id}: ${c.name}`);

  const cat =
    opts.categoryId != null ? snap.categories.find((c) => c.id === opts.categoryId) : null;
  if (cat && cat.subcategories.length > 0) {
    lines.push('', `SUBCATEGORIAS de "${cat.name}" (use os ids em subcategoryIds):`);
    for (const s of cat.subcategories) lines.push(`- ${s.id}: ${s.name}`);
  }

  return lines.join('\n');
}

/** Descarta grupos/categorias/subcategorias que não existem na taxonomia. Retorna cópia limpa. */
export function validateAgentFilter(filtro: AgentFilter, snap: TaxonomySnapshot): AgentFilter {
  const out: AgentFilter = {};

  if (filtro.groupSlug != null) {
    out.groupSlug = snap.groups.some((g) => g.slug === filtro.groupSlug) ? filtro.groupSlug : null;
  }

  let resolvedCategory: TaxonomyCategory | undefined;
  if (filtro.categoryId != null) {
    resolvedCategory = snap.categories.find((c) => c.id === filtro.categoryId);
    out.categoryId = resolvedCategory ? filtro.categoryId : null;
  }

  if (Array.isArray(filtro.subcategoryIds) && filtro.subcategoryIds.length > 0) {
    const allowed = resolvedCategory
      ? new Set(resolvedCategory.subcategories.map((s) => s.id))
      : new Set(snap.categories.flatMap((c) => c.subcategories.map((s) => s.id)));
    const kept = [...new Set(filtro.subcategoryIds)].filter((id) => allowed.has(Number(id)));
    if (kept.length > 0) out.subcategoryIds = kept.map(Number);
  }

  if (filtro.query != null) {
    const q = String(filtro.query).trim();
    out.query = q.length > 0 ? q : null;
  }
  if (typeof filtro.priceMin === 'number' && Number.isFinite(filtro.priceMin)) {
    out.priceMin = filtro.priceMin;
  }
  if (typeof filtro.priceMax === 'number' && Number.isFinite(filtro.priceMax)) {
    out.priceMax = filtro.priceMax;
  }

  return out;
}
