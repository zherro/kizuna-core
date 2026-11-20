import { GOOGLE_CREATIVE_ID, type AdCreative, type AdLiveCampaign, type AdSlotConfig } from '../../shared/ads';
import { getVisitorId, isAutomated } from '../analytics/visitor';

export type AdPool = { slots: AdSlotConfig[]; creatives: AdCreative[] };

// v2 = mesma regra da fn_ad_track + dedup no servidor por visitante do dia (plugin ads 0002).
const TRACK_URL = '/api/resources/fn_ad_track_v2';
const SEEN_PREFIX = 'kz-ad-seen:';
let pool: Promise<AdPool> | null = null;

async function getItems<T>(resource: string, pageSize: number, init: RequestInit = {}): Promise<T[]> {
  try {
    const res = await fetch(`/api/resources/${resource}?pageSize=${pageSize}`, { credentials: 'same-origin', ...init });
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
  campaigns = null;
}

let campaigns: Promise<AdLiveCampaign[]> | null = null;

/**
 * Campanhas pagas no ar (plugin marketing, `vw_ad_campaigns_live`: só criativo e espaço, sem
 * valores). Uma busca por carga de página, SEM cache (pausa/fim de campanha vale na hora). Só é
 * chamada quando o projeto liga o modo pago (`paidShare` no AdSlot); falha → [] (sorteio antigo).
 */
export function loadLiveCampaigns(): Promise<AdLiveCampaign[]> {
  if (!campaigns) {
    campaigns = getItems<{ creativeId?: string; slotSlug?: string }>('vw_ad_campaigns_live', 1000, { cache: 'no-store' })
      .then((rows) =>
        rows
          .map((r) => ({ creativeId: String(r.creativeId ?? ''), slotSlug: String(r.slotSlug ?? '') }))
          .filter((r) => r.creativeId && r.slotSlug),
      )
      .catch(() => []);
  }
  return campaigns;
}

const memSeen = new Set<string>();

/**
 * true na 1ª vez do dia (UTC, o mesmo dia do id de visitante) para (evento, espaço, criativo) nesta
 * sessão do navegador; marca na hora, antes do envio — recarregar a página, a rotação voltar ao
 * mesmo criativo ou um duplo clique não disparam de novo. Sem sessionStorage, vale a memória.
 */
function firstTimeToday(event: string, slot: string, creativeId: string | null): boolean {
  const key = `${SEEN_PREFIX}${new Date().toISOString().slice(0, 10)}:${event}:${slot}:${creativeId ?? 'google'}`;
  if (memSeen.has(key)) return false;
  memSeen.add(key);
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, '1');
  } catch { /* só memória */ }
  return true;
}

export function __resetAdTrackSeen() {
  memSeen.clear();
}

/**
 * Registra impressão/clique (best-effort). Conta uma vez por dia por visitante, espaço e criativo:
 * aqui por sessão (evita a requisição) e no servidor pelo id anônimo diário (`fn_ad_track_v2`).
 */
export function trackAd(p: { slot: string; creativeId: string | null; page: string; event: 'impression' | 'click' }): void {
  if (typeof window === 'undefined' || isAutomated()) return;
  const creativeId = p.creativeId && p.creativeId !== GOOGLE_CREATIVE_ID ? p.creativeId : null;
  if (!firstTimeToday(p.event, p.slot, creativeId)) return;
  const body = JSON.stringify({
    p_slot: p.slot,
    p_creative_id: creativeId,
    p_page: p.page,
    p_event: p.event,
    p_visitor_hash: getVisitorId(),
  });
  try {
    if (navigator.sendBeacon?.(TRACK_URL, new Blob([body], { type: 'application/json' }))) return;
  } catch { /* cai no fetch */ }
  void fetch(TRACK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
}
