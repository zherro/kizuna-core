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

describe('buildOwnerStats: aparelho, região e IP mascarado', () => {
  const bounds = { from: '2026-09-27', to: '2026-09-29', prevFrom: '2026-09-24', prevTo: '2026-09-26' };
  const A = '0b1d5a1e-7c3e-4a9a-9d0e-2f5f6a7b8c9d';
  const mk = (extra: Partial<AnalyticsRow>, day = '2026-09-28'): AnalyticsRow => ({
    entity_id: A,
    visitor_hash: 'v1',
    day,
    event_type: 'view',
    source: 'search',
    ...extra,
  });
  const build = (rows: AnalyticsRow[]) => buildOwnerStats({ days: 3, bounds, rows });

  it('byDevice: views por aparelho, unknown quando nulo, share inteiro, desc', () => {
    const s = build([
      mk({ visitor_hash: 'a', device: 'mobile' }),
      mk({ visitor_hash: 'b', device: 'mobile' }),
      mk({ visitor_hash: 'c', device: 'desktop' }),
      mk({ visitor_hash: 'd', device: null }),
      mk({ visitor_hash: 'e', event_type: 'impression', device: 'tablet' }),
      mk({ visitor_hash: 'f', device: 'tablet' }, '2026-09-25'),
    ]);
    expect(s.byDevice).toEqual([
      { device: 'mobile', views: 2, share: 50 },
      { device: 'desktop', views: 1, share: 25 },
      { device: 'unknown', views: 1, share: 25 },
    ]);
  });

  it('byRegion: junta cidade+UF, só UF vira a UF, vazio vira Não informado', () => {
    const s = build([
      mk({ visitor_hash: 'a', region_city: 'Cuiabá', region_uf: 'MT' }),
      mk({ visitor_hash: 'b', region_city: 'Cuiabá', region_uf: 'MT' }),
      mk({ visitor_hash: 'c', region_uf: 'MT' }),
      mk({ visitor_hash: 'd' }),
    ]);
    expect(s.byRegion).toEqual([
      { key: 'Cuiabá|MT', label: 'Cuiabá/MT', uf: 'MT', city: 'Cuiabá', views: 2, share: 50 },
      { key: 'MT', label: 'MT', uf: 'MT', city: null, views: 1, share: 25 },
      { key: '_none', label: 'Não informado', uf: '', city: null, views: 1, share: 25 },
    ]);
  });

  it('byIp: só com ip_key, views = view, visitorDays distintos, mostra mascarado', () => {
    const ip = { ip_key: 'k1', ip_masked: '187.12.x.x' };
    const s = build([
      mk({ visitor_hash: 'a', ...ip }),
      mk({ visitor_hash: 'a', ...ip }, '2026-09-29'),
      mk({ visitor_hash: 'b', ...ip }),
      mk({ visitor_hash: 'c', event_type: 'contact_click', ...ip }),
      mk({ visitor_hash: 'z', ip_key: 'old', ip_masked: '1.1.x.x' }, '2026-09-25'),
      mk({ visitor_hash: 'n' }),
      mk({ visitor_hash: 'i', event_type: 'impression', ip_key: 'imp', ip_masked: '9.9.x.x' }),
    ]);
    expect(s.byIp).toEqual([{ ipKey: 'k1', ipMasked: '187.12.x.x', views: 3, visitorDays: 2 }]);
  });

  it('byIp: visitorDays conta visitor_hash distintos', () => {
    const ip = { ip_key: 'k1', ip_masked: '187.12.x.x' };
    const s = build([
      mk({ visitor_hash: 'a', ...ip }),
      mk({ visitor_hash: 'a', ...ip }, '2026-09-29'),
      mk({ visitor_hash: 'b', ...ip }),
    ]);
    expect(s.byIp).toEqual([{ ipKey: 'k1', ipMasked: '187.12.x.x', views: 3, visitorDays: 2 }]);
  });

  it('byIp: teto de 50, ordenado por views desc com desempate por ipMasked', () => {
    const rows = Array.from({ length: 60 }, (_, i) =>
      mk({ visitor_hash: `v${i}`, ip_key: `k${i}`, ip_masked: `10.0.${i}.x` })
    );
    rows.push(mk({ visitor_hash: 'extra', ip_key: 'k59', ip_masked: '10.0.59.x' }));
    const s = build(rows);
    expect(s.byIp).toHaveLength(50);
    expect(s.byIp[0]).toMatchObject({ ipKey: 'k59', views: 2 });
  });

  it('nenhum objeto carrega a chave ip', () => {
    const s = build([
      mk({ device: 'mobile', region_uf: 'MT', ip_key: 'k1', ip_masked: '1.2.x.x' }),
    ]);
    for (const o of [...s.byDevice, ...s.byRegion, ...s.byIp]) expect(o).not.toHaveProperty('ip');
  });

  it('sem linhas: listas vazias', () => {
    const s = build([]);
    expect(s.byDevice).toEqual([]);
    expect(s.byRegion).toEqual([]);
    expect(s.byIp).toEqual([]);
  });
});
