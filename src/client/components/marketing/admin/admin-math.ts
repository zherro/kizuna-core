import {
  committedDays,
  costCents,
  earliestStop,
  elapsedDays,
  addDays,
  periodDays,
  situation,
  type Situation,
} from '../../../../shared/marketing/cost';

/** Linhas já mapeadas (camelCase) pelos recursos de marketing. */
export type BalanceRow = { tenantId: string; balanceCents: number; creditedCents: number; committedCents: number };
export type BoostRow = {
  id: string;
  serviceUid: string;
  tenantId: string;
  dailyCents: number;
  startsOn: string;
  endsOn: string;
  stoppedOn: string | null;
  title: string;
};
export type CampaignRow = {
  id: string;
  creativeId: string;
  slotSlug: string;
  tenantId: string;
  dailyCents: number;
  startsOn: string;
  endsOn: string;
  stoppedOn: string | null;
  label: string;
  imageUrl: string;
  format: string;
  kind: string;
};
export type LedgerRow = { id: string; tenantId: string; kind: string; amountCents: number; createdAt: string };
export type BoostMetricRow = { boostId: string; tenantId: string; day: string; impressions: number; views: number; contactClicks: number; interactions: number };
export type DeliveryRow = { campaignId: string; tenantId: string; day: string; impressions: number; clicks: number };

type Spendable = { dailyCents: number; startsOn: string; endsOn: string; stoppedOn: string | null };

export const asPeriod = (r: Spendable) => ({ startsOn: r.startsOn, endsOn: r.endsOn, stoppedOn: r.stoppedOn });

/** Custo comprometido (o que já saiu do saldo: período inteiro menos o devolvido por parada). */
export const committedOf = (r: Spendable) => costCents(r.dailyCents, asPeriod(r));

/** Gasto até hoje (dias já servidos × diária). */
export const spentOf = (r: Spendable, today?: string) => r.dailyCents * elapsedDays(asPeriod(r), today);

export const situationOf = (r: Spendable, today?: string): Situation => situation(asPeriod(r), today);

/** Pode parar? Só linha não parada e cuja data de parada ainda cabe no período (regra do banco). */
export function canStop(r: Spendable, today?: string): boolean {
  if (r.stoppedOn) return false;
  return earliestStop(r, today) <= addDays(r.endsOn, 1);
}

export function stopDate(r: Spendable, today?: string): string {
  return earliestStop(r, today);
}

/** Quanto volta ao saldo se parar agora. */
export function refundOf(r: Spendable, today?: string): number {
  return Math.max(0, committedOf(r) - costCents(r.dailyCents, { ...asPeriod(r), stoppedOn: stopDate(r, today) }));
}

export const SITUATION_LABEL: Record<Situation, string> = {
  scheduled: 'Agendado',
  live: 'No ar',
  stopped: 'Parado',
  ended: 'Encerrado',
};

export const ctr = (clicks: number, impressions: number): number | null => (impressions > 0 ? clicks / impressions : null);

export function formatPct(v: number | null): string {
  return v == null ? '—' : `${(v * 100).toFixed(2).replace('.', ',')}%`;
}

export function shortId(id: string): string {
  return id ? `…${id.slice(-6)}` : '—';
}

// -------- Anunciantes --------

export type Advertiser = {
  tenantId: string;
  /** Título de um anúncio da conta (o admin não lê user_data); null se a conta ainda não tem boost/campanha. */
  label: string | null;
  balanceCents: number;
  creditedCents: number;
  committedCents: number;
  activeBoosts: number;
  activeCampaigns: number;
  spentCents: number;
};

export function buildAdvertisers(a: {
  balances: BalanceRow[];
  boosts: BoostRow[];
  campaigns: CampaignRow[];
  today?: string;
}): Advertiser[] {
  const map = new Map<string, Advertiser>();
  const get = (tenantId: string): Advertiser => {
    let r = map.get(tenantId);
    if (!r) {
      r = { tenantId, label: null, balanceCents: 0, creditedCents: 0, committedCents: 0, activeBoosts: 0, activeCampaigns: 0, spentCents: 0 };
      map.set(tenantId, r);
    }
    return r;
  };
  for (const b of a.balances) {
    const r = get(b.tenantId);
    r.balanceCents = b.balanceCents;
    r.creditedCents = b.creditedCents;
    r.committedCents = b.committedCents;
  }
  for (const b of a.boosts) {
    const r = get(b.tenantId);
    if (!r.label && b.title) r.label = b.title;
    if (situationOf(b, a.today) === 'live') r.activeBoosts += 1;
    r.spentCents += spentOf(b, a.today);
  }
  for (const c of a.campaigns) {
    const r = get(c.tenantId);
    if (!r.label && c.label) r.label = c.label;
    if (situationOf(c, a.today) === 'live') r.activeCampaigns += 1;
    r.spentCents += spentOf(c, a.today);
  }
  return [...map.values()].sort((x, y) => y.committedCents - x.committedCents || x.tenantId.localeCompare(y.tenantId));
}

export function filterAdvertisers(list: Advertiser[], query: string): Advertiser[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((r) => r.tenantId.toLowerCase().includes(q) || (r.label ?? '').toLowerCase().includes(q));
}

// -------- Métricas por período --------

export type TenantMetrics = {
  tenantId: string;
  label: string | null;
  creditsCents: number;
  committedCents: number;
  boostImpressions: number;
  boostViews: number;
  contactClicks: number;
  bannerImpressions: number;
  bannerClicks: number;
};

export type MetricsTotals = Omit<TenantMetrics, 'tenantId' | 'label'>;

/** Primeiro dia (inclusive) de uma janela de `days` dias terminando hoje. */
export function periodFrom(days: number, today: string): string {
  return addDays(today, -(days - 1));
}

export function buildTenantMetrics(a: {
  from: string;
  ledger: LedgerRow[];
  boosts: BoostRow[];
  campaigns: CampaignRow[];
  boostMetrics: BoostMetricRow[];
  delivery: DeliveryRow[];
}): { rows: TenantMetrics[]; totals: MetricsTotals } {
  const map = new Map<string, TenantMetrics>();
  const get = (tenantId: string): TenantMetrics => {
    let r = map.get(tenantId);
    if (!r) {
      r = { tenantId, label: null, creditsCents: 0, committedCents: 0, boostImpressions: 0, boostViews: 0, contactClicks: 0, bannerImpressions: 0, bannerClicks: 0 };
      map.set(tenantId, r);
    }
    return r;
  };
  for (const l of a.ledger) {
    // Crédito lançado no período; `adjust` (correção) fica de fora da "receita".
    if (l.kind !== 'adjust' && l.amountCents > 0 && l.createdAt.slice(0, 10) >= a.from) get(l.tenantId).creditsCents += l.amountCents;
  }
  for (const b of a.boosts) {
    const r = get(b.tenantId);
    if (!r.label && b.title) r.label = b.title;
    if (b.startsOn >= a.from || b.endsOn >= a.from) r.committedCents += committedOf(b);
  }
  for (const c of a.campaigns) {
    const r = get(c.tenantId);
    if (!r.label && c.label) r.label = c.label;
    if (c.startsOn >= a.from || c.endsOn >= a.from) r.committedCents += committedOf(c);
  }
  for (const m of a.boostMetrics) {
    if (m.day < a.from) continue;
    const r = get(m.tenantId);
    r.boostImpressions += m.impressions;
    r.boostViews += m.views;
    r.contactClicks += m.contactClicks;
  }
  for (const d of a.delivery) {
    if (d.day < a.from) continue;
    const r = get(d.tenantId);
    r.bannerImpressions += d.impressions;
    r.bannerClicks += d.clicks;
  }
  const rows = [...map.values()].sort(
    (x, y) => y.committedCents + y.creditsCents - (x.committedCents + x.creditsCents) || x.tenantId.localeCompare(y.tenantId),
  );
  const totals = rows.reduce<MetricsTotals>(
    (t, r) => ({
      creditsCents: t.creditsCents + r.creditsCents,
      committedCents: t.committedCents + r.committedCents,
      boostImpressions: t.boostImpressions + r.boostImpressions,
      boostViews: t.boostViews + r.boostViews,
      contactClicks: t.contactClicks + r.contactClicks,
      bannerImpressions: t.bannerImpressions + r.bannerImpressions,
      bannerClicks: t.bannerClicks + r.bannerClicks,
    }),
    { creditsCents: 0, committedCents: 0, boostImpressions: 0, boostViews: 0, contactClicks: 0, bannerImpressions: 0, bannerClicks: 0 },
  );
  return { rows, totals };
}

// -------- Impulsionamentos / campanhas: agregados de métricas por linha --------

export type BoostStats = { impressions: number; views: number; contactClicks: number };
export function sumBoostMetrics(rows: BoostMetricRow[]): Map<string, BoostStats> {
  const out = new Map<string, BoostStats>();
  for (const m of rows) {
    const s = out.get(m.boostId) ?? { impressions: 0, views: 0, contactClicks: 0 };
    s.impressions += m.impressions;
    s.views += m.views;
    s.contactClicks += m.contactClicks;
    out.set(m.boostId, s);
  }
  return out;
}

export type DeliveryStats = { impressions: number; clicks: number };
export function sumDelivery(rows: DeliveryRow[]): Map<string, DeliveryStats> {
  const out = new Map<string, DeliveryStats>();
  for (const d of rows) {
    const s = out.get(d.campaignId) ?? { impressions: 0, clicks: 0 };
    s.impressions += d.impressions;
    s.clicks += d.clicks;
    out.set(d.campaignId, s);
  }
  return out;
}

/** Custo por visualização de detalhe (centavos), ou null sem visualizações. */
export function costPerView(spentCents: number, views: number): number | null {
  return views > 0 ? Math.round(spentCents / views) : null;
}

// -------- Fila de banners --------

export type CreativeRow = {
  id: string;
  tenantId: string | null;
  format: string;
  kind: string;
  imageUrl: string;
  alt: string;
  linkUrl: string;
  label: string;
  slots: string[];
  active: boolean;
  createdAt: string;
};
export type ReviewRow = { creativeId: string; status: string; reason: string };

/**
 * Fila de moderação: criativos de anunciantes (tenant_id preenchido) sem revisão, ou aprovados que
 * ainda não ficaram ativos (a 2ª escrita da aprovação falhou). Mais antigos primeiro.
 */
export function moderationQueue(creatives: CreativeRow[], reviews: ReviewRow[]): CreativeRow[] {
  const byId = new Map(reviews.map((r) => [r.creativeId, r]));
  return creatives
    .filter((c) => {
      if (!c.tenantId) return false;
      const r = byId.get(c.id);
      return !r || (r.status === 'approved' && !c.active);
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function validateRejection(reason: string): string {
  const t = reason.trim();
  if (t.length < 3) return 'Explique o motivo da reprovação (mínimo 3 caracteres).';
  if (t.length > 300) return 'O motivo pode ter no máximo 300 caracteres.';
  return '';
}

// -------- Crédito --------

export type CreditMode = 'credit' | 'adjust';
export const MAX_CREDIT_CENTS = 100_000_000;

export function validateCredit(a: { mode: CreditMode; cents: number; balanceCents: number | null }): string {
  if (!Number.isFinite(a.cents) || a.cents <= 0) return 'Informe um valor maior que zero.';
  if (a.cents > MAX_CREDIT_CENTS) return 'Valor acima do limite de R$ 1.000.000,00 por lançamento.';
  return '';
}

/** Valor com sinal que vai para o livro-razão. */
export const ledgerAmount = (mode: CreditMode, cents: number): number => (mode === 'adjust' ? -Math.abs(cents) : Math.abs(cents));
export const ledgerKind = (mode: CreditMode): 'credit_admin' | 'adjust' => (mode === 'adjust' ? 'adjust' : 'credit_admin');

export { committedDays, periodDays };
