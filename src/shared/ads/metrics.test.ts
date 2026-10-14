import { describe, expect, it } from 'vitest';
import { dailySeries, groupStats, summarize, summarizeOwn, type AdStatRow } from './metrics';
import { AD_SLOT_CATALOG } from './catalog';
import { GOOGLE_CREATIVE_ID } from './types';

const rows: AdStatRow[] = [
  { slot_slug: 'home-meio', creative_id: 'c1', page: '/', day: '2026-10-12', impressions: 100, clicks: 5 },
  { slot_slug: 'home-meio', creative_id: '00000000-0000-0000-0000-000000000000', page: '/', day: '2026-10-13', impressions: 50, clicks: 0 },
  { slot_slug: 'cidade-topo', creative_id: 'c1', page: '/[cidade]', day: '2026-10-13', impressions: 10, clicks: 1 },
];

describe('metrics', () => {
  it('summarize com filtros e CTR', () => {
    expect(summarize(rows)).toEqual({ impressions: 160, clicks: 6, ctr: 6 / 160 });
    expect(summarize(rows, { page: '/' })).toEqual({ impressions: 150, clicks: 5, ctr: 5 / 150 });
    expect(summarize([], {})).toEqual({ impressions: 0, clicks: 0, ctr: null });
  });
  it('summarizeOwn ignora o Google', () => {
    const g = { slot_slug: 's', creative_id: GOOGLE_CREATIVE_ID, page: '/', day: '2026-10-13', impressions: 1000, clicks: 0 };
    const own = { slot_slug: 's', creative_id: 'c1', page: '/', day: '2026-10-13', impressions: 100, clicks: 5 };
    expect(summarizeOwn([g, own])).toEqual({ impressions: 100, clicks: 5, ctr: 0.05 });
    expect(summarizeOwn([g], { slot: 's' })).toEqual({ impressions: 0, clicks: 0, ctr: null });
  });
  it('catálogo: descobrir-card sem posição montada', () => {
    expect(AD_SLOT_CATALOG.find((d) => d.slug === 'descobrir-card')?.mounted).toBe(false);
    expect(AD_SLOT_CATALOG.filter((d) => d.mounted === false)).toHaveLength(1);
  });
  it('groupStats ordena por impressões', () => {
    expect(groupStats(rows, 'page').map((g) => g.key)).toEqual(['/', '/[cidade]']);
    expect(groupStats(rows, 'creative_id')[0].key).toBe('c1');
  });
  it('dailySeries preenche dias vazios', () => {
    const s = dailySeries(rows, '2026-10-11', '2026-10-13');
    expect(s.map((d) => d.day)).toEqual(['2026-10-11', '2026-10-12', '2026-10-13']);
    expect(s.map((d) => d.impressions)).toEqual([0, 100, 60]);
  });
});
