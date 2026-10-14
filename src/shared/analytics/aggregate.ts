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
/** Metadados de um anúncio vindos do resource `services` (título e categoria). */
export type EntityMeta = { title: string; categoryKey: string; categoryLabel: string };

export const UNCATEGORIZED_KEY = '_none';
export const UNCATEGORIZED_LABEL = 'Sem categoria';

/** Nota agregada de um anúncio (`review_stats`): média 0-5 e nº de avaliações publicadas. */
export type EntityRating = { average: number; count: number };

type Counters = { impressions: number; views: number; favorites: number; contacts: number };

export type OwnerStats = {
  days: PeriodDays;
  from: string;
  to: string;
  /** `value: null` = sem base de cálculo (ex.: CTR sem impressões) — a UI mostra "—". */
  metrics: Record<string, { value: number | null; delta: number }>;
  series: { day: string; views: number; contacts: number }[];
  /** Compat: só views por origem. Prefira `bySource`. */
  sources: { source: string; total: number; share: number }[];
  bySource: (Counters & {
    source: string;
    shares: number;
    ctr: number | null;
    contactRate: number | null;
  })[];
  byCategory: (Counters & {
    categoryKey: string;
    label: string;
    ctr: number | null;
    contactRate: number | null;
  })[];
  entities: (Counters & {
    entityId: string;
    title?: string;
    category?: string;
    /** Média 1 casa; null sem avaliações. */
    rating?: number | null;
    ratingCount?: number;
  })[];
  /** Total de avaliações publicadas dos anúncios do tenant (base de `metrics.rating`). */
  ratingCount: number;
  /** Houve mais linhas do que o limite de leitura: números do início do período podem estar baixos. */
  truncated: boolean;
  /** Nenhum evento no período atual nem no anterior. */
  empty: boolean;
};

const round1 = (n: number) => Math.round(n * 10) / 10;
/** Razão em %, limitada a 100 (view/contato são por sessão; impressão pode faltar). Sem base = null. */
export function ratio(a: number, b: number): number | null {
  return b > 0 ? Math.min(100, round1((a / b) * 100)) : null;
}

function metricValues(rows: AnalyticsRow[]): Record<string, number | null> {
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

const zero = (): Counters => ({ impressions: 0, views: 0, favorites: 0, contacts: 0 });
function bump(c: Counters, e: AnalyticsEvent) {
  if (e === 'impression') c.impressions += 1;
  else if (e === 'view') c.views += 1;
  else if (e === 'favorite') c.favorites += 1;
  else if (e === 'contact_click') c.contacts += 1;
}

/** Datas 'YYYY-MM-DD' comparam corretamente como string. */
export function buildOwnerStats(input: {
  days: PeriodDays;
  bounds: Bounds;
  rows: AnalyticsRow[];
  /** entity_id → título/categoria (resource `services`). */
  meta?: Record<string, EntityMeta>;
  truncated?: boolean;
  /** entity_id (uid do anúncio) → nota agregada (`review_stats`). Snapshot: não varia com o período. */
  ratings?: Record<string, EntityRating>;
}): OwnerStats {
  const { days, bounds, rows, meta = {}, truncated = false, ratings = {} } = input;
  const current = rows.filter((r) => r.day >= bounds.from && r.day <= bounds.to);
  const previous = rows.filter((r) => r.day >= bounds.prevFrom && r.day <= bounds.prevTo);

  const cur = metricValues(current);
  const prev = metricValues(previous);
  const metrics: OwnerStats['metrics'] = {};
  for (const id of Object.keys(cur)) {
    const c = cur[id];
    // Razão sem base (null) não tem variação; com base anterior nula compara contra 0.
    metrics[id] = { value: c, delta: c === null ? 0 : deltaPct(c, prev[id] ?? 0) };
  }

  // Média ponderada pelo nº de avaliações de cada anúncio; sem avaliações = null (snapshot, sem delta).
  let ratingCount = 0;
  let ratingSum = 0;
  for (const r of Object.values(ratings)) {
    if (r.count > 0) {
      ratingCount += r.count;
      ratingSum += r.average * r.count;
    }
  }
  metrics.rating = { value: ratingCount > 0 ? round1(ratingSum / ratingCount) : null, delta: 0 };

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

  const srcMap = new Map<string, Counters & { shares: number }>();
  const catMap = new Map<string, Counters & { label: string }>();
  const entMap = new Map<string, Counters>();
  for (const r of current) {
    const src = srcMap.get(r.source) ?? { ...zero(), shares: 0 };
    bump(src, r.event_type);
    if (r.event_type === 'share') src.shares += 1;
    srcMap.set(r.source, src);

    const m = meta[r.entity_id];
    const key = m?.categoryKey || UNCATEGORIZED_KEY;
    const cat = catMap.get(key) ?? { ...zero(), label: m?.categoryLabel || UNCATEGORIZED_LABEL };
    bump(cat, r.event_type);
    catMap.set(key, cat);

    const ent = entMap.get(r.entity_id) ?? zero();
    bump(ent, r.event_type);
    entMap.set(r.entity_id, ent);
  }

  const bySource: OwnerStats['bySource'] = [...srcMap.entries()]
    .map(([source, c]) => ({
      source,
      ...c,
      ctr: ratio(c.views, c.impressions),
      contactRate: ratio(c.contacts, c.views),
    }))
    .sort((a, b) => b.views + b.impressions - (a.views + a.impressions));

  const viewSum = bySource.reduce((s, x) => s + x.views, 0);
  const sources = bySource
    .filter((s) => s.views > 0)
    .sort((a, b) => b.views - a.views)
    .map((s) => ({
      source: s.source,
      total: s.views,
      share: viewSum > 0 ? Math.round((s.views / viewSum) * 100) : 0,
    }));

  const byCategory: OwnerStats['byCategory'] = [...catMap.entries()]
    .map(([categoryKey, { label, ...c }]) => ({
      categoryKey,
      label,
      ...c,
      ctr: ratio(c.views, c.impressions),
      contactRate: ratio(c.contacts, c.views),
    }))
    .sort((a, b) => b.views - a.views || b.impressions - a.impressions);

  const entities: OwnerStats['entities'] = [...entMap.entries()]
    .map(([entityId, c]) => ({
      entityId,
      ...c,
      ...(meta[entityId]
        ? { title: meta[entityId].title, category: meta[entityId].categoryLabel }
        : {}),
      ...(ratings[entityId]
        ? {
            rating: ratings[entityId].count > 0 ? round1(ratings[entityId].average) : null,
            ratingCount: ratings[entityId].count,
          }
        : {}),
    }))
    .sort((a, b) => b.views - a.views);

  return {
    days,
    from: bounds.from,
    to: bounds.to,
    metrics,
    series,
    sources,
    bySource,
    byCategory,
    entities,
    ratingCount,
    truncated,
    empty: current.length === 0 && previous.length === 0,
  };
}
