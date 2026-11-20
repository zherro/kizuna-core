import { describe, expect, it } from 'vitest';
import { baselineWindow, costPerView, ctr, denseSeries, lift, spentSoFar, splitPaidOrganic, sum } from './metrics-math';

const p = { startsOn: '2026-12-01', endsOn: '2026-12-07' };

describe('metrics-math', () => {
  it('custo por visualização e CTR sem divisão por zero', () => {
    expect(costPerView(3000, 0)).toBeNull();
    expect(costPerView(3000, 40)).toBe(75);
    expect(ctr(0, 0)).toBeNull();
    expect(ctr(5, 200)).toBe(2.5);
  });
  it('gasto até hoje respeita parada e fim', () => {
    expect(spentSoFar(1000, p, '2026-12-03')).toBe(3000);
    expect(spentSoFar(1000, { ...p, stoppedOn: '2026-12-03' }, '2026-12-06')).toBe(2000);
    expect(spentSoFar(1000, p, '2027-02-01')).toBe(7000);
    expect(spentSoFar(1000, p, '2026-11-01')).toBe(0);
  });
  it('série densa preenche dias sem evento', () => {
    const s = denseSeries([{ day: '2026-12-02', v: 4 }], '2026-12-01', '2026-12-03', (r) => r.v);
    expect(s).toEqual([
      { day: '2026-12-01', value: 0 },
      { day: '2026-12-02', value: 4 },
      { day: '2026-12-03', value: 0 },
    ]);
  });
  it('janela anterior tem o mesmo tamanho', () => {
    expect(baselineWindow('2026-12-10', 3)).toEqual({ from: '2026-12-07', to: '2026-12-09' });
  });
  it('lift', () => {
    expect(lift(10, 25, 3).pct).toBe(150);
    expect(lift(0, 25, 3).pct).toBeNull();
    expect(lift(10, 25, 0).pct).toBeNull();
  });
  it('sum', () => {
    expect(sum([{ a: 1 }, { a: 2 }], 'a')).toBe(3);
  });
});

describe('splitPaidOrganic', () => {
  it('separa o que a vaga patrocinada entregou do orgânico no período', () => {
    const r = splitPaidOrganic([
      { day: '2026-12-01', impressions: 10, views: 4, contactClicks: 1, interactions: 0, sponsoredImpressions: 6, sponsoredViews: 3, sponsoredContactClicks: 1, sponsoredInteractions: 0 },
      { day: '2026-12-02', impressions: 5, views: 1, contactClicks: 0, interactions: 2, sponsoredImpressions: 2, sponsoredViews: 0, sponsoredContactClicks: 0, sponsoredInteractions: 1 },
    ]);
    expect(r.total).toEqual({ impressions: 15, views: 5, contactClicks: 1, interactions: 2 });
    expect(r.paid).toEqual({ impressions: 8, views: 3, contactClicks: 1, interactions: 1 });
    expect(r.organic).toEqual({ impressions: 7, views: 2, contactClicks: 0, interactions: 1 });
  });

  it('banco sem a migração (sem sponsored_*): tudo orgânico, nunca negativo', () => {
    const r = splitPaidOrganic([{ day: '2026-12-01', impressions: 3, views: 1, contactClicks: 0, interactions: 0 }]);
    expect(r.paid.impressions).toBe(0);
    expect(r.organic.impressions).toBe(3);
  });
});
