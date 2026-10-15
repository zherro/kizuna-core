/**
 * `service-ref` field — pure helpers (no React). The picker searches active ads through the
 * public search RPC (`fn_search_services`, plugin `search`) and stores the chosen ad `uid`.
 */

import { SEARCH_RPC, type SearchAdsBody } from '../search/search-types';
import type { ServiceRefFilter } from './types';

/** Endpoint of the search RPC (same proxy used by the search page). */
export const SERVICE_REF_SEARCH_URL = `/api/resources/${SEARCH_RPC}`;

/** Page size of a picker search — enough to survive the client-side category filter. */
export const SERVICE_REF_PAGE_SIZE = 30;

export type ServiceRefOption = { uid: string; title: string; city: string | null };

/** Body of the search RPC for the typed text (no region filter: the place may be in any city). */
export function buildServiceRefSearchBody(
  filter: ServiceRefFilter | undefined,
  query: string
): SearchAdsBody {
  const q = query.trim();
  return {
    p_state: null,
    p_city_id: null,
    p_city_ibge: null,
    p_group_category_slug: filter?.groupSlug?.trim() || null,
    p_category_id: null,
    p_subcategories: null,
    p_query: q || null,
    p_seed: 0,
    p_page: 0,
    p_page_size: SERVICE_REF_PAGE_SIZE,
  };
}

/** Group slugs of the filter, deduped (`groupSlug` first). */
export function serviceRefGroups(filter: ServiceRefFilter | undefined): string[] {
  const all = [filter?.groupSlug, ...(filter?.groupSlugs ?? [])]
    .map((g) => (g ?? '').trim())
    .filter(Boolean);
  return [...new Set(all)];
}

/** One search body per group of the filter; no group = a single ungrouped body. */
export function buildServiceRefSearchBodies(
  filter: ServiceRefFilter | undefined,
  query: string
): SearchAdsBody[] {
  const groups = serviceRefGroups(filter);
  if (!groups.length) return [buildServiceRefSearchBody(undefined, query)];
  return groups.map((groupSlug) => buildServiceRefSearchBody({ groupSlug }, query));
}

/** Search rows → picker options, keeping only the allowed categories (when set). */
export function pickServiceRefOptions(
  rows: ReadonlyArray<Record<string, unknown>>,
  filter: ServiceRefFilter | undefined
): ServiceRefOption[] {
  const allowed = (filter?.categorySlugs ?? []).filter(Boolean);
  const out: ServiceRefOption[] = [];
  for (const r of rows) {
    const uid = typeof r.uid === 'string' ? r.uid : '';
    if (!uid) continue;
    if (allowed.length && !allowed.includes(String(r.category_slug ?? ''))) continue;
    const city = typeof r.city === 'string' && r.city.trim() ? r.city.trim() : null;
    out.push({ uid, title: String(r.title ?? '').trim() || uid, city });
  }
  return out;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A saved code (`espaco-art-festas`) as readable text (`Espaco art festas`). */
export function humanizeServiceRefValue(value: string): string {
  const t = value.trim().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ');
  return t ? t[0].toUpperCase() + t.slice(1) : '';
}

/** POST one search body; non-ok = no rows. */
export async function searchServiceRefRows(body: SearchAdsBody): Promise<Record<string, unknown>[]> {
  const res = await fetch(SERVICE_REF_SEARCH_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) return [];
  const data = (await res.json().catch(() => ({}))) as { items?: Record<string, unknown>[] } | Record<string, unknown>[];
  return Array.isArray(data) ? data : (data.items ?? []);
}

/**
 * Resolve a saved value — an ad `uid` or a code (`extras.codigo`, what importers write) — into
 * title + city. Reads the ad through `/api/resources/services` (active ads are readable by
 * signed-in users) and the city through the search RPC. `null` = not found or not readable.
 */
export async function resolveServiceRefValue(value: string): Promise<ServiceRefOption | null> {
  const v = value.trim();
  if (!v) return null;
  try {
    const q = new URLSearchParams({ pageSize: '1' });
    q.set(UUID_RE.test(v) ? 'filter.uid' : 'filter.extras->>codigo', v);
    const res = await fetch(`/api/resources/services?${q}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => ({}))) as { items?: Record<string, unknown>[] };
    const found = (data.items ?? [])[0];
    const uid = typeof found?.uid === 'string' ? found.uid : '';
    const title = String(found?.title ?? '').trim();
    if (!uid || !title) return null;
    let city: string | null = null;
    try {
      const hit = pickServiceRefOptions(await searchServiceRefRows(buildServiceRefSearchBody(undefined, title)), undefined).find(
        (o) => o.uid === uid
      );
      city = hit?.city ?? null;
    } catch {
      city = null;
    }
    return { uid, title, city };
  } catch {
    return null;
  }
}
