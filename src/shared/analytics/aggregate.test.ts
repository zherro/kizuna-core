import { describe, it, expect } from 'vitest';
import {
  buildOwnerStats,
  deltaPct,
  parsePeriodDays,
  periodBounds,
  type AnalyticsRow,
} from './aggregate';

describe('parsePeriodDays', () => {
  it('aceita 7/30/90 e cai em 30', () => {
    expect(parsePeriodDays('7')).toBe(7);
    expect(parsePeriodDays('90')).toBe(90);
    expect(parsePeriodDays('15')).toBe(30);
    expect(parsePeriodDays(null)).toBe(30);
  });
});

describe('periodBounds', () => {
  it('calcula janela atual e anterior em UTC', () => {
    expect(periodBounds(7, new Date('2026-09-29T15:00:00Z'))).toEqual({
      from: '2026-09-23',
      to: '2026-09-29',
      prevFrom: '2026-09-16',
      prevTo: '2026-09-22',
    });
  });
});

describe('deltaPct', () => {
  it('trata base zero', () => {
    expect(deltaPct(10, 0)).toBe(100);
    expect(deltaPct(0, 0)).toBe(0);
  });
  it('arredonda a variação', () => {
    expect(deltaPct(112, 100)).toBe(12);
    expect(deltaPct(96, 100)).toBe(-4);
  });
});

describe('buildOwnerStats', () => {
  const bounds = { from: '2026-09-27', to: '2026-09-29', prevFrom: '2026-09-24', prevTo: '2026-09-26' };
  const A = '0b1d5a1e-7c3e-4a9a-9d0e-2f5f6a7b8c9d';
  const B = '1c2e6b2f-8d4f-4bab-8e1f-3a6a7b8c9d0e';

  const row = (
    day: string,
    event_type: AnalyticsRow['event_type'],
    entity_id = A,
    visitor_hash = 'v1',
    source = 'search'
  ): AnalyticsRow => ({ day, event_type, entity_id, visitor_hash, source });

  const rows: AnalyticsRow[] = [
    // janela atual (27..29)
    ...['a', 'b', 'c', 'd'].map((v) => row('2026-09-28', 'impression', A, v)),
    ...['a', 'b', 'c', 'd'].map((v) => row('2026-09-28', 'impression', B, v)),
    row('2026-09-28', 'view', A, 'a', 'search'),
    row('2026-09-28', 'view', A, 'b', 'search'),
    row('2026-09-29', 'view', B, 'a', 'search'),
    row('2026-09-29', 'view', B, 'c', 'home'),
    row('2026-09-29', 'contact_click', B, 'a'),
    row('2026-09-29', 'favorite', A, 'a'),
    // janela anterior (24..26)
    row('2026-09-25', 'view', A, 'x'),
    row('2026-09-25', 'impression', A, 'x'),
    // fora das duas janelas
    row('2026-09-01', 'view', A, 'old'),
  ];
  const stats = buildOwnerStats({ days: 3, bounds, rows });

  it('conta métricas do período e calcula derivadas', () => {
    expect(stats.metrics.views).toEqual({ value: 4, delta: 300 });
    expect(stats.metrics.impressions).toEqual({ value: 8, delta: 700 });
    expect(stats.metrics.ctr.value).toBe(50);
    expect(stats.metrics.contacts.value).toBe(1);
    expect(stats.metrics.contactRate.value).toBe(25);
    expect(stats.metrics.favorites.value).toBe(1);
    expect(stats.metrics.shares.value).toBe(0);
  });

  it('visitantes únicos = hashes distintos entre as views', () => {
    expect(stats.metrics.uniques.value).toBe(3); // a, b, c
  });

  it('métricas sem fonte não existem', () => {
    for (const id of ['conversations', 'responseTime', 'credits']) {
      expect(stats.metrics[id]).toBeUndefined();
    }
  });

  it('rating: sem avaliações = null; com avaliações = média ponderada e nota por anúncio', () => {
    expect(stats.metrics.rating).toEqual({ value: null, delta: 0 });
    expect(stats.ratingCount).toBe(0);
    const s = buildOwnerStats({
      days: 3,
      bounds,
      rows,
      ratings: { [A]: { average: 5, count: 1 }, [B]: { average: 4, count: 3 }, other: { average: 1, count: 0 } },
    });
    expect(s.metrics.rating).toEqual({ value: 4.3, delta: 0 });
    expect(s.ratingCount).toBe(4);
    expect(s.entities.find((e) => e.entityId === B)).toMatchObject({ rating: 4, ratingCount: 3 });
  });

  it('série tem um item por dia, zerado quando vazio', () => {
    expect(stats.series).toEqual([
      { day: '2026-09-27', views: 0, contacts: 0 },
      { day: '2026-09-28', views: 2, contacts: 0 },
      { day: '2026-09-29', views: 2, contacts: 1 },
    ]);
  });

  it('sources (compat): participação só das views', () => {
    expect(stats.sources).toEqual([
      { source: 'search', total: 3, share: 75 },
      { source: 'home', total: 1, share: 25 },
    ]);
  });

  it('bySource agrega impressões, views e contatos por origem', () => {
    const search = stats.bySource.find((s) => s.source === 'search')!;
    expect(search).toMatchObject({ impressions: 8, views: 3, contacts: 1, favorites: 1 });
    expect(search.ctr).toBe(37.5);
    expect(search.contactRate).toBe(33.3);
    const home = stats.bySource.find((s) => s.source === 'home')!;
    expect(home).toMatchObject({ impressions: 0, views: 1, contacts: 0, ctr: null, contactRate: 0 });
  });

  it('byCategory agrega pelo meta do anúncio; sem meta = Sem categoria', () => {
    const s = buildOwnerStats({
      days: 3,
      bounds,
      rows,
      meta: { [A]: { title: 'A', categoryKey: '1', categoryLabel: 'Pets' } },
    });
    expect(s.byCategory.map((c) => [c.label, c.views, c.impressions, c.contacts]).sort()).toEqual([
      ['Pets', 2, 4, 0],
      ['Sem categoria', 2, 4, 1],
    ]);
    expect(s.entities.find((e) => e.entityId === A)).toMatchObject({ title: 'A', category: 'Pets' });
  });

  it('CTR nunca passa de 100% e sem impressões é null', () => {
    const s = buildOwnerStats({
      days: 3,
      bounds,
      rows: [row('2026-09-28', 'impression', A, 'a'), row('2026-09-28', 'view', A, 'a'), row('2026-09-28', 'view', A, 'b')],
    });
    expect(s.metrics.ctr.value).toBe(100);
    const none = buildOwnerStats({ days: 3, bounds, rows: [row('2026-09-28', 'view', A, 'a')] });
    expect(none.metrics.ctr.value).toBeNull();
  });

  it('propaga truncated e marca empty', () => {
    expect(buildOwnerStats({ days: 3, bounds, rows, truncated: true }).truncated).toBe(true);
    expect(stats.truncated).toBe(false);
    expect(stats.empty).toBe(false);
    expect(buildOwnerStats({ days: 3, bounds, rows: [] }).empty).toBe(true);
  });

  it('anúncios ordenados por views', () => {
    expect(stats.entities).toEqual([
      { entityId: A, impressions: 4, views: 2, favorites: 1, contacts: 0 },
      { entityId: B, impressions: 4, views: 2, favorites: 0, contacts: 1 },
    ]);
  });

  it('sem linhas não quebra nem divide por zero', () => {
    const s = buildOwnerStats({ days: 3, bounds, rows: [] });
    expect(s.metrics.ctr).toEqual({ value: null, delta: 0 });
    expect(s.byCategory).toEqual([]);
    expect(s.sources).toEqual([]);
    expect(s.entities).toEqual([]);
    expect(s.series).toHaveLength(3);
  });
});
