import { describe, expect, it } from 'vitest';
import {
  buildAdvertisers,
  buildTenantMetrics,
  canStop,
  costPerView,
  ctr,
  filterAdvertisers,
  formatPct,
  ledgerAmount,
  ledgerKind,
  moderationQueue,
  periodFrom,
  refundOf,
  spentOf,
  stopDate,
  sumBoostMetrics,
  sumDelivery,
  validateCredit,
  validateRejection,
  type BoostRow,
  type CampaignRow,
  type CreativeRow,
} from './admin-math';

const boost = (o: Partial<BoostRow> = {}): BoostRow => ({
  id: '1', serviceUid: 'u', tenantId: 'T1', dailyCents: 1000, startsOn: '2026-12-01', endsOn: '2026-12-07', stoppedOn: null, title: 'Pizzaria', ...o,
});
const camp = (o: Partial<CampaignRow> = {}): CampaignRow => ({
  id: 'c1', creativeId: 'k', slotSlug: 'cidade-topo', tenantId: 'T1', dailyCents: 2000, startsOn: '2026-12-01', endsOn: '2026-12-02', stoppedOn: null,
  label: 'Promo', imageUrl: '/a', format: 'banner', kind: 'imagem', ...o,
});

describe('parar', () => {
  it('só pode parar o que não foi parado e ainda cabe no período', () => {
    expect(canStop(boost(), '2026-12-03')).toBe(true);
    expect(canStop(boost({ stoppedOn: '2026-12-04' }), '2026-12-03')).toBe(false);
    // último dia: parar amanhã ainda é ends_on + 1 (aceito pelo banco)
    expect(canStop(boost(), '2026-12-07')).toBe(true);
    // encerrado há dias: a data mínima (amanhã) passa de ends_on + 1
    expect(canStop(boost(), '2026-12-10')).toBe(false);
  });
  it('data de parada e devolução', () => {
    expect(stopDate(boost(), '2026-12-03')).toBe('2026-12-04');
    expect(refundOf(boost(), '2026-12-03')).toBe(4000);
    expect(refundOf(boost({ startsOn: '2026-12-20', endsOn: '2026-12-22' }), '2026-12-03')).toBe(3000);
  });
  it('gasto até hoje', () => {
    expect(spentOf(boost(), '2026-12-03')).toBe(3000);
  });
});

describe('buildAdvertisers', () => {
  it('junta saldo, boosts e campanhas por conta e conta os ativos', () => {
    const list = buildAdvertisers({
      balances: [{ tenantId: 'T1', balanceCents: 5000, creditedCents: 30000, committedCents: 25000 }],
      boosts: [boost()],
      campaigns: [camp(), camp({ id: 'c2', tenantId: 'T2', label: 'Outra' })],
      today: '2026-12-02',
    });
    const t1 = list.find((r) => r.tenantId === 'T1')!;
    expect(t1).toMatchObject({ balanceCents: 5000, activeBoosts: 1, activeCampaigns: 1, label: 'Pizzaria' });
    expect(t1.spentCents).toBe(2000 + 4000);
    const t2 = list.find((r) => r.tenantId === 'T2')!;
    expect(t2).toMatchObject({ balanceCents: 0, label: 'Outra' });
    expect(list[0].tenantId).toBe('T1');
  });
  it('busca por título ou id da conta', () => {
    const list = buildAdvertisers({ balances: [], boosts: [boost()], campaigns: [], today: '2026-12-02' });
    expect(filterAdvertisers(list, 'pizza')).toHaveLength(1);
    expect(filterAdvertisers(list, 't1')).toHaveLength(1);
    expect(filterAdvertisers(list, 'xyz')).toHaveLength(0);
  });
});

describe('buildTenantMetrics', () => {
  it('soma só o que cai no período e separa receita de ajuste', () => {
    const { rows, totals } = buildTenantMetrics({
      from: '2026-12-01',
      ledger: [
        { id: '1', tenantId: 'T1', kind: 'credit_admin', amountCents: 10000, createdAt: '2026-12-02T10:00:00Z' },
        { id: '2', tenantId: 'T1', kind: 'credit_admin', amountCents: 5000, createdAt: '2026-11-01T10:00:00Z' },
        { id: '3', tenantId: 'T1', kind: 'adjust', amountCents: -2000, createdAt: '2026-12-03T10:00:00Z' },
      ],
      boosts: [boost()],
      campaigns: [],
      boostMetrics: [
        { boostId: '1', tenantId: 'T1', day: '2026-12-02', impressions: 100, views: 10, contactClicks: 2, interactions: 1 },
        { boostId: '1', tenantId: 'T1', day: '2026-11-20', impressions: 999, views: 99, contactClicks: 9, interactions: 0 },
      ],
      delivery: [{ campaignId: 'c', tenantId: 'T2', day: '2026-12-02', impressions: 500, clicks: 5 }],
    });
    const t1 = rows.find((r) => r.tenantId === 'T1')!;
    expect(t1).toMatchObject({ creditsCents: 10000, committedCents: 7000, boostImpressions: 100, boostViews: 10, contactClicks: 2 });
    expect(totals).toMatchObject({ creditsCents: 10000, bannerImpressions: 500, bannerClicks: 5, boostViews: 10 });
  });
  it('janela de dias termina hoje', () => {
    expect(periodFrom(7, '2026-12-07')).toBe('2026-12-01');
  });
});

describe('agregados por linha', () => {
  it('soma métricas por boost e entrega por campanha', () => {
    const m = sumBoostMetrics([
      { boostId: '1', tenantId: 'T', day: 'a', impressions: 5, views: 2, contactClicks: 1, interactions: 0 },
      { boostId: '1', tenantId: 'T', day: 'b', impressions: 5, views: 1, contactClicks: 0, interactions: 0 },
    ]);
    expect(m.get('1')).toEqual({ impressions: 10, views: 3, contactClicks: 1 });
    const d = sumDelivery([
      { campaignId: 'c', tenantId: 'T', day: 'a', impressions: 10, clicks: 1 },
      { campaignId: 'c', tenantId: 'T', day: 'b', impressions: 30, clicks: 1 },
    ]);
    expect(d.get('c')).toEqual({ impressions: 40, clicks: 2 });
  });
  it('ctr, porcentagem e custo por visualização', () => {
    expect(ctr(1, 0)).toBeNull();
    expect(formatPct(ctr(5, 200))).toBe('2,50%');
    expect(formatPct(null)).toBe('—');
    expect(costPerView(3000, 0)).toBeNull();
    expect(costPerView(3000, 12)).toBe(250);
  });
});

describe('fila de moderação', () => {
  const cr = (o: Partial<CreativeRow>): CreativeRow => ({
    id: 'a', tenantId: 'T1', format: 'banner', kind: 'gif', imageUrl: '/x', alt: '', linkUrl: 'https://x.com', label: '', slots: [], active: false, createdAt: '2026-12-01T00:00:00Z', ...o,
  });
  it('ignora criativos do site, já revisados e ativos; traz aprovados que não ativaram', () => {
    const q = moderationQueue(
      [
        cr({ id: '1' }),
        cr({ id: '2', tenantId: null }),
        cr({ id: '3' }),
        cr({ id: '4' }),
        cr({ id: '5', active: true }),
        cr({ id: '6', createdAt: '2026-11-01T00:00:00Z' }),
      ],
      [
        { creativeId: '3', status: 'rejected', reason: 'x' },
        { creativeId: '4', status: 'approved', reason: '' },
        { creativeId: '5', status: 'approved', reason: '' },
      ],
    );
    expect(q.map((c) => c.id)).toEqual(['6', '1', '4']);
  });
  it('motivo obrigatório', () => {
    expect(validateRejection(' a ')).not.toBe('');
    expect(validateRejection('Imagem ilegível')).toBe('');
    expect(validateRejection('x'.repeat(301))).not.toBe('');
  });
});

describe('crédito', () => {
  it('valida valor e define sinal/kind do lançamento', () => {
    expect(validateCredit({ mode: 'credit', cents: 0, balanceCents: 0 })).not.toBe('');
    expect(validateCredit({ mode: 'credit', cents: NaN, balanceCents: 0 })).not.toBe('');
    expect(validateCredit({ mode: 'credit', cents: 200_000_000, balanceCents: 0 })).not.toBe('');
    expect(validateCredit({ mode: 'credit', cents: 5000, balanceCents: 0 })).toBe('');
    expect(ledgerAmount('credit', 5000)).toBe(5000);
    expect(ledgerAmount('adjust', 5000)).toBe(-5000);
    expect(ledgerKind('adjust')).toBe('adjust');
    expect(ledgerKind('credit')).toBe('credit_admin');
  });
});
