import { GOOGLE_CREATIVE_ID } from './types';

export type AdStatRow = {
  slot_slug: string;
  creative_id: string;
  page: string;
  day: string;
  impressions: number;
  clicks: number;
};
type Totals = { impressions: number; clicks: number; ctr: number | null };
const totals = (impressions: number, clicks: number): Totals => ({
  impressions, clicks, ctr: impressions > 0 ? clicks / impressions : null,
});

export function summarize(
  rows: AdStatRow[],
  f: { slot?: string; page?: string; creativeId?: string } = {},
): Totals {
  let i = 0;
  let c = 0;
  for (const r of rows) {
    if (f.slot && r.slot_slug !== f.slot) continue;
    if (f.page && r.page !== f.page) continue;
    if (f.creativeId && r.creative_id !== f.creativeId) continue;
    i += r.impressions;
    c += r.clicks;
  }
  return totals(i, c);
}

/** Como `summarize`, mas ignora as linhas do Google (sem clique): CTR de criativos próprios. */
export function summarizeOwn(
  rows: AdStatRow[],
  f: { slot?: string; page?: string; creativeId?: string } = {},
): Totals {
  return summarize(
    rows.filter((r) => r.creative_id !== GOOGLE_CREATIVE_ID),
    f,
  );
}

export function groupStats(rows: AdStatRow[], key: 'slot_slug' | 'creative_id' | 'page') {
  const m = new Map<string, { impressions: number; clicks: number }>();
  for (const r of rows) {
    const cur = m.get(r[key]) ?? { impressions: 0, clicks: 0 };
    cur.impressions += r.impressions;
    cur.clicks += r.clicks;
    m.set(r[key], cur);
  }
  return [...m.entries()]
    .map(([k, v]) => ({ key: k, ...totals(v.impressions, v.clicks) }))
    .sort((a, b) => b.impressions - a.impressions);
}

export function dailySeries(rows: AdStatRow[], from: string, to: string) {
  const byDay = new Map<string, { impressions: number; clicks: number }>();
  for (const r of rows) {
    const cur = byDay.get(r.day) ?? { impressions: 0, clicks: 0 };
    cur.impressions += r.impressions;
    cur.clicks += r.clicks;
    byDay.set(r.day, cur);
  }
  const out: { day: string; impressions: number; clicks: number }[] = [];
  const end = new Date(`${to}T00:00:00Z`).getTime();
  for (let t = new Date(`${from}T00:00:00Z`).getTime(); t <= end; t += 86_400_000) {
    const day = new Date(t).toISOString().slice(0, 10);
    out.push({ day, ...(byDay.get(day) ?? { impressions: 0, clicks: 0 }) });
  }
  return out;
}
