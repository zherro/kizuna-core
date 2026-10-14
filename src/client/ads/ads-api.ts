import { GOOGLE_CREATIVE_ID, type AdCreative, type AdSlotConfig } from '../../shared/ads';
import { isAutomated } from '../analytics/visitor';

export type AdPool = { slots: AdSlotConfig[]; creatives: AdCreative[] };

const TRACK_URL = '/api/resources/fn_ad_track';
let pool: Promise<AdPool> | null = null;

async function getItems<T>(resource: string, pageSize: number): Promise<T[]> {
  try {
    const res = await fetch(`/api/resources/${resource}?pageSize=${pageSize}`, { credentials: 'same-origin' });
    if (!res.ok) return [];
    const body = (await res.json()) as { items?: T[] };
    return Array.isArray(body.items) ? body.items : [];
  } catch {
    return [];
  }
}

/** Uma busca por carga de página (slots habilitados + criativos vigentes; a RLS filtra). */
export function loadAdPool(): Promise<AdPool> {
  if (!pool) {
    // Cada recurso falha isolado (vira []); maxPageSize do ad_slots é 100, ad_creatives 200.
    pool = Promise.all([getItems<AdSlotConfig>('ad_slots', 100), getItems<AdCreative>('ad_creatives', 200)])
      .then(([slots, creatives]) => ({ slots, creatives }))
      .catch(() => ({ slots: [], creatives: [] }));
  }
  return pool;
}

export function __resetAdPool() {
  pool = null;
}

export function trackAd(p: { slot: string; creativeId: string | null; page: string; event: 'impression' | 'click' }): void {
  if (typeof window === 'undefined' || isAutomated()) return;
  const body = JSON.stringify({
    p_slot: p.slot,
    p_creative_id: p.creativeId && p.creativeId !== GOOGLE_CREATIVE_ID ? p.creativeId : null,
    p_page: p.page,
    p_event: p.event,
  });
  try {
    if (navigator.sendBeacon?.(TRACK_URL, new Blob([body], { type: 'application/json' }))) return;
  } catch { /* cai no fetch */ }
  void fetch(TRACK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
}
