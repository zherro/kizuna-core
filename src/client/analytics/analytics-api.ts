import {
  ANALYTICS_SOURCES,
  buildOwnerStats,
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

const TRACK_URL = '/api/resources/fn_analytics_track';
const EVENTS_URL = '/api/resources/analytics_events';
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
 * e para quando passa do início da janela anterior. Limite: MAX_PAGES x PAGE_SIZE linhas.
 */
async function fetchRows(minDay: string, signal?: AbortSignal): Promise<AnalyticsRow[]> {
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
    if (items.length < PAGE_SIZE || !last || last.day < minDay) break;
  }
  return rows;
}

export async function fetchOwnerStats(days: PeriodDays, signal?: AbortSignal): Promise<OwnerStats> {
  const bounds = periodBounds(days);
  const rows = await fetchRows(bounds.prevFrom, signal);
  return buildOwnerStats({ days, bounds, rows });
}
