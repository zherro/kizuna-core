import {
  ANALYTICS_SOURCES,
  buildOwnerStats,
  classifyDevice,
  UNCATEGORIZED_KEY,
  UNCATEGORIZED_LABEL,
  type EntityMeta,
  type EntityRating,
  periodBounds,
  type AnalyticsEvent,
  type AnalyticsRow,
  type AnalyticsSource,
  type OwnerStats,
  type PeriodDays,
} from '../../shared/analytics';
import { getVisitorId, isAutomated } from './visitor';

export type TrackPayload = {
  entityType: string;
  entityId: string;
  event: AnalyticsEvent;
  visibleMs?: number;
  source?: AnalyticsSource;
};

const TRACK_URL = '/api/analytics/track';
const EVENTS_URL = '/api/resources/analytics_events';
const SERVICES_URL = '/api/resources/services';
const SERVICES_PAGE_SIZE = 100;
const SERVICES_MAX_PAGES = 50;
const REVIEW_STATS_URL = '/api/resources/review_stats';
const REVIEW_DOMAIN = 'service';
const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

/** Best-effort: sendBeacon (sobrevive a navegação) com fallback para fetch keepalive. */
export function sendTrack(p: TrackPayload): void {
  if (typeof window === 'undefined' || isAutomated()) return;
  const body = JSON.stringify({
    p_entity_type: p.entityType,
    p_entity_id: p.entityId,
    p_event_type: p.event,
    p_visitor_hash: getVisitorId(),
    p_source: p.source && ANALYTICS_SOURCES.includes(p.source) ? p.source : 'direct',
    p_visible_ms: Math.round(p.visibleMs ?? 0),
    p_device: classifyDevice(navigator.userAgent, window.innerWidth),
  });
  try {
    if (
      typeof navigator.sendBeacon === 'function' &&
      navigator.sendBeacon(TRACK_URL, new Blob([body], { type: 'application/json' }))
    ) {
      return;
    }
  } catch {
    /* cai no fetch */
  }
  void fetch(TRACK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}

/** Ação explícita (clique em contato, favorito, compartilhar): conta na hora, sem limiar. */
export function trackEvent(p: Omit<TrackPayload, 'visibleMs'>): void {
  sendTrack({ ...p, visibleMs: 0 });
}

/**
 * Lê `analytics_events` (RLS: só anúncios do tenant da sessão) do mais novo para o mais antigo
 * e para quando passa do início da janela anterior. Limite: MAX_PAGES x PAGE_SIZE linhas;
 * `truncated` avisa quando o limite cortou dados ainda dentro da janela.
 */
async function fetchRows(
  minDay: string,
  signal?: AbortSignal
): Promise<{ rows: AnalyticsRow[]; truncated: boolean }> {
  const rows: AnalyticsRow[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const qs = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      orderBy: 'id',
      orderDirection: 'desc',
    });
    const res = await fetch(`${EVENTS_URL}?${qs}`, { signal, cache: 'no-store' });
    if (!res.ok) throw new Error(`analytics_events ${res.status}`);
    const data = (await res.json().catch(() => null)) as { items?: AnalyticsRow[] } | null;
    const items = Array.isArray(data?.items) ? data.items : [];
    rows.push(...items);
    const last = items[items.length - 1];
    if (items.length < PAGE_SIZE || !last || last.day < minDay) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}

type ServiceItem = {
  id?: string | number;
  uid?: string;
  title?: string;
  category?: { id?: unknown; name?: unknown } | null;
  categoryId?: string;
};

/**
 * Título e categoria de cada anúncio do tenant (resource `services`, paginado até acabar).
 * Best-effort: falha devolve o que já leu — a agregação segue, só sem categoria.
 */
export async function fetchServiceMeta(
  tenantId: string,
  signal?: AbortSignal
): Promise<Record<string, EntityMeta>> {
  return (await fetchServices(tenantId, signal)).meta;
}

async function fetchServices(
  tenantId: string,
  signal?: AbortSignal
): Promise<{ meta: Record<string, EntityMeta>; idToUid: Record<string, string> }> {
  const meta: Record<string, EntityMeta> = {};
  const idToUid: Record<string, string> = {};
  try {
    for (let page = 1; page <= SERVICES_MAX_PAGES; page++) {
      const qs = new URLSearchParams({
        page: String(page),
        pageSize: String(SERVICES_PAGE_SIZE),
        'filter.tenant_id': tenantId,
      });
      const res = await fetch(`${SERVICES_URL}?${qs}`, { signal });
      if (!res.ok) break;
      const data = (await res.json().catch(() => null)) as { items?: ServiceItem[] } | null;
      const items = Array.isArray(data?.items) ? data.items : [];
      for (const s of items) {
        if (!s.uid) continue;
        const name = typeof s.category?.name === 'string' ? s.category.name : '';
        const key = String(s.categoryId || s.category?.id || '');
        if (s.id !== undefined && s.id !== null && s.id !== '') idToUid[String(s.id)] = s.uid;
        meta[s.uid] = {
          title: s.title || 'Anúncio',
          categoryKey: key || UNCATEGORIZED_KEY,
          categoryLabel: name || UNCATEGORIZED_LABEL,
        };
      }
      if (items.length < SERVICES_PAGE_SIZE) break;
    }
  } catch {
    /* aborto/rede: devolve o parcial */
  }
  return { meta, idToUid };
}

type ReviewStatsItem = { referenceId?: string; totalReviews?: number; averageRating?: number };

/**
 * Nota agregada por anúncio do tenant. O resource `review_stats` (leitura pública, mantido por
 * trigger) só aceita filtro `eq`: lê `domain=service` + `tenant_id` paginado (uma linha por
 * anúncio avaliado) e traduz `reference_id` (id numérico do serviço) para uid via `idToUid`.
 * Limitação: depende de `review_stats.tenant_id` = tenant do anúncio. Best-effort: falha = sem nota.
 */
export async function fetchRatings(
  tenantId: string,
  idToUid: Record<string, string>,
  signal?: AbortSignal
): Promise<Record<string, EntityRating>> {
  const out: Record<string, EntityRating> = {};
  try {
    for (let page = 1; page <= SERVICES_MAX_PAGES; page++) {
      const qs = new URLSearchParams({
        page: String(page),
        pageSize: String(SERVICES_PAGE_SIZE),
        'filter.domain': REVIEW_DOMAIN,
        'filter.tenant_id': tenantId,
      });
      const res = await fetch(`${REVIEW_STATS_URL}?${qs}`, { signal, cache: 'no-store' });
      if (!res.ok) break;
      const data = (await res.json().catch(() => null)) as { items?: ReviewStatsItem[] } | null;
      const items = Array.isArray(data?.items) ? data.items : [];
      for (const it of items) {
        const uid = idToUid[String(it.referenceId ?? '')];
        const count = Number(it.totalReviews ?? 0);
        if (uid && count > 0) out[uid] = { average: Number(it.averageRating ?? 0), count };
      }
      if (items.length < SERVICES_PAGE_SIZE) break;
    }
  } catch {
    /* aborto/rede: devolve o parcial */
  }
  return out;
}

export async function fetchOwnerStats(
  days: PeriodDays,
  signal?: AbortSignal,
  opts: { tenantId?: string } = {}
): Promise<OwnerStats> {
  const bounds = periodBounds(days);
  const { tenantId } = opts;
  const [{ rows, truncated }, { meta, ratings }] = await Promise.all([
    fetchRows(bounds.prevFrom, signal),
    tenantId
      ? fetchServices(tenantId, signal).then(async (s) => ({
          meta: s.meta,
          ratings: await fetchRatings(tenantId, s.idToUid, signal),
        }))
      : Promise.resolve({ meta: {}, ratings: {} }),
  ]);
  return buildOwnerStats({ days, bounds, rows, meta, truncated, ratings });
}
