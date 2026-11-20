import { addDays, committedDays, elapsedDays, periodDays, type Period } from '../../../../shared/marketing/cost';

export type DailyPoint = {
  day: string;
  impressions: number;
  views: number;
  contactClicks: number;
  interactions: number;
  /** Parte da vaga patrocinada (marketing 0003). Ausente em banco sem a migração = 0. */
  sponsoredImpressions?: number;
  sponsoredViews?: number;
  sponsoredContactClicks?: number;
  sponsoredInteractions?: number;
};

export type Totals = { impressions: number; views: number; contactClicks: number; interactions: number };

/**
 * Separa o período do impulsionamento em PAGO (o que a vaga patrocinada entregou: card exibido na vaga,
 * detalhe aberto a partir dela e cliques depois disso) e ORGÂNICO (o resto, que o anúncio teria de
 * qualquer jeito). Orgânico nunca fica negativo.
 */
export function splitPaidOrganic(rows: DailyPoint[]): { total: Totals; paid: Totals; organic: Totals } {
  const total: Totals = {
    impressions: sum(rows, 'impressions'),
    views: sum(rows, 'views'),
    contactClicks: sum(rows, 'contactClicks'),
    interactions: sum(rows, 'interactions'),
  };
  const paid: Totals = {
    impressions: sum(rows, 'sponsoredImpressions'),
    views: sum(rows, 'sponsoredViews'),
    contactClicks: sum(rows, 'sponsoredContactClicks'),
    interactions: sum(rows, 'sponsoredInteractions'),
  };
  const organic: Totals = {
    impressions: Math.max(0, total.impressions - paid.impressions),
    views: Math.max(0, total.views - paid.views),
    contactClicks: Math.max(0, total.contactClicks - paid.contactClicks),
    interactions: Math.max(0, total.interactions - paid.interactions),
  };
  return { total, paid, organic };
}
export type DeliveryPoint = { day: string; impressions: number; clicks: number };

export function sum<T extends object>(rows: T[], key: keyof T): number {
  return rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);
}

/** Custo por visualização do detalhe (centavos); null se ainda não houve visualização. */
export function costPerView(spentCents: number, views: number): number | null {
  return views > 0 ? Math.round(spentCents / views) : null;
}

/** CTR em %, uma casa; null sem impressão. */
export function ctr(clicks: number, impressions: number): number | null {
  return impressions > 0 ? Math.round((clicks / impressions) * 1000) / 10 : null;
}

/** Gasto até hoje: diária × dias já servidos (limitado aos comprometidos). */
export function spentSoFar(dailyCents: number, p: Period, today?: string): number {
  return dailyCents * servedDays(p, today);
}

/** Dias efetivamente servidos até hoje (inclui hoje), limitados aos comprometidos. */
export function servedDays(p: Period, today?: string): number {
  return Math.max(0, Math.min(elapsedDays(p, today), committedDays(p)));
}

/** Uma posição por dia do intervalo (dias sem evento = 0), para o gráfico não "pular" datas. */
export function denseSeries<T extends { day: string }>(
  rows: T[],
  from: string,
  to: string,
  pick: (r: T) => number,
): { day: string; value: number }[] {
  const byDay = new Map<string, number>();
  for (const r of rows) byDay.set(r.day, (byDay.get(r.day) ?? 0) + pick(r));
  const out: { day: string; value: number }[] = [];
  const days = periodDays({ startsOn: from, endsOn: to });
  for (let i = 0; i < days; i++) {
    const day = addDays(from, i);
    out.push({ day, value: byDay.get(day) ?? 0 });
  }
  return out;
}

/** Janela de comparação: mesmo nº de dias imediatamente antes do início. */
export function baselineWindow(startsOn: string, days: number): { from: string; to: string } {
  return { from: addDays(startsOn, -days), to: addDays(startsOn, -1) };
}

export type Lift = { before: number; during: number; pct: number | null };

/** Ganho sobre o período anterior de mesmo tamanho. pct null se não havia base (antes = 0). */
export function lift(before: number, during: number, days: number): Lift {
  if (days <= 0) return { before, during, pct: null };
  return { before, during, pct: before > 0 ? Math.round(((during - before) / before) * 100) : null };
}
