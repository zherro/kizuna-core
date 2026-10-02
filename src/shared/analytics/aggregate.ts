import type { AnalyticsEvent } from './config';

export type PeriodDays = 7 | 30 | 90;

export function parsePeriodDays(v: string | null): PeriodDays {
  return v === '7' ? 7 : v === '90' ? 90 : 30;
}

export type Bounds = { from: string; to: string; prevFrom: string; prevTo: string };

const DAY_MS = 86_400_000;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Janela atual (hoje inclusive) e a anterior de mesmo tamanho, em UTC. */
export function periodBounds(days: PeriodDays, today: Date = new Date()): Bounds {
  const t = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return {
    from: isoDay(t - (days - 1) * DAY_MS),
    to: isoDay(t),
    prevFrom: isoDay(t - (2 * days - 1) * DAY_MS),
    prevTo: isoDay(t - days * DAY_MS),
  };
}

export function deltaPct(cur: number, prev: number): number {
  if (prev === 0) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 100);
}

/** Linha de `analytics_events` como o resource devolve (uma por visitante/entidade/evento/dia). */
export type AnalyticsRow = {
  entity_id: string;
  visitor_hash: string;
  day: string;
  event_type: AnalyticsEvent;
  source: string;
};

export type OwnerStats = {
  days: PeriodDays;
  from: string;
  to: string;
  metrics: Record<string, { value: number | null; delta: number }>;
  series: { day: string; views: number; contacts: number }[];
  sources: { source: string; total: number; share: number }[];
  entities: {
    entityId: string;
    impressions: number;
    views: number;
    favorites: number;
    contacts: number;
  }[];
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const ratio = (a: number, b: number) => (b > 0 ? round1((a / b) * 100) : 0);

function metricValues(rows: AnalyticsRow[]): Record<string, number> {
  const count = (e: AnalyticsEvent) => rows.filter((r) => r.event_type === e).length;
  const views = count('view');
  const contacts = count('contact_click');
  const impressions = count('impression');
  return {
    impressions,
    views,
    // Hashes rotacionam por dia: "únicos" = visitantes-dia distintos entre as views.
    uniques: new Set(rows.filter((r) => r.event_type === 'view').map((r) => r.visitor_hash)).size,
    ctr: ratio(views, impressions),
    favorites: count('favorite'),
    shares: count('share'),
    contacts,
    contactRate: ratio(contacts, views),
  };
}

const UNSOURCED = ['conversations', 'rating', 'responseTime', 'credits'];

/** Datas 'YYYY-MM-DD' comparam corretamente como string. */
export function buildOwnerStats(input: {
  days: PeriodDays;
  bounds: Bounds;
  rows: AnalyticsRow[];
}): OwnerStats {
  const { days, bounds, rows } = input;
  const current = rows.filter((r) => r.day >= bounds.from && r.day <= bounds.to);
  const previous = rows.filter((r) => r.day >= bounds.prevFrom && r.day <= bounds.prevTo);

  const cur = metricValues(current);
  const prev = metricValues(previous);
  const metrics: OwnerStats['metrics'] = {};
  for (const id of Object.keys(cur)) {
    metrics[id] = { value: cur[id], delta: deltaPct(cur[id], prev[id]) };
  }
  for (const id of UNSOURCED) metrics[id] = { value: null, delta: 0 };

  const start = Date.parse(`${bounds.from}T00:00:00Z`);
  const series: OwnerStats['series'] = Array.from({ length: days }, (_, i) => {
    const day = isoDay(start + i * DAY_MS);
    const ofDay = current.filter((r) => r.day === day);
    return {
      day,
      views: ofDay.filter((r) => r.event_type === 'view').length,
      contacts: ofDay.filter((r) => r.event_type === 'contact_click').length,
    };
  });

  const bySource = new Map<string, number>();
  for (const r of current) {
    if (r.event_type === 'view') bySource.set(r.source, (bySource.get(r.source) ?? 0) + 1);
  }
  const sourceSum = [...bySource.values()].reduce((s, n) => s + n, 0);
  const sources = [...bySource.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([source, total]) => ({
      source,
      total,
      share: sourceSum > 0 ? Math.round((total / sourceSum) * 100) : 0,
    }));

  const byEntity = new Map<string, OwnerStats['entities'][number]>();
  for (const r of current) {
    const slot =
      byEntity.get(r.entity_id) ??
      { entityId: r.entity_id, impressions: 0, views: 0, favorites: 0, contacts: 0 };
    if (r.event_type === 'impression') slot.impressions += 1;
    if (r.event_type === 'view') slot.views += 1;
    if (r.event_type === 'favorite') slot.favorites += 1;
    if (r.event_type === 'contact_click') slot.contacts += 1;
    byEntity.set(r.entity_id, slot);
  }
  const entities = [...byEntity.values()].sort((a, b) => b.views - a.views);

  return { days, from: bounds.from, to: bounds.to, metrics, series, sources, entities };
}
