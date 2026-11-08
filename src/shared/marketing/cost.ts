/**
 * Custo do marketing — espelha, em TypeScript, a conta que o banco faz em `vw_wallet_balance` e nas
 * policies de `boosts`/`ad_campaigns` (plugins/marketing/0001_marketing.sql). Valores em CENTAVOS.
 *
 * Datas são `YYYY-MM-DD` no dia do BANCO (UTC, `CURRENT_DATE`). Use `dbToday()` — não a data local,
 * senão à noite no Brasil o "hoje" do navegador fica um dia atrás do banco e a policy recusa.
 */

export const MIN_DAILY_CENTS = 500;
export const MAX_DAILY_CENTS = 1_000_000;
export const MAX_PERIOD_DAYS = 90;
const DAY_MS = 86_400_000;

export type Period = { startsOn: string; endsOn: string; stoppedOn?: string | null };

const toDay = (iso: string): number => Math.floor(Date.parse(`${iso}T00:00:00Z`) / DAY_MS);
const fromDay = (n: number): string => new Date(n * DAY_MS).toISOString().slice(0, 10);

/** Dia corrente do banco (UTC). */
export function dbToday(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return fromDay(toDay(iso) + days);
}

/** Dias do período, contando início e fim (0 se inválido). */
export function periodDays(p: Pick<Period, 'startsOn' | 'endsOn'>): number {
  const n = toDay(p.endsOn) - toDay(p.startsOn) + 1;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Dias comprometidos (cobrados): o período inteiro, menos o que sobra depois de `stoppedOn`. */
export function committedDays(p: Period): number {
  const total = periodDays(p);
  if (total === 0) return 0;
  const lastExclusive = Math.min(toDay(p.endsOn) + 1, p.stoppedOn ? toDay(p.stoppedOn) : Infinity);
  return Math.max(0, Math.min(total, lastExclusive - toDay(p.startsOn)));
}

export function costCents(dailyCents: number, p: Period): number {
  return Math.max(0, Math.round(dailyCents)) * committedDays(p);
}

/** Dias já consumidos até hoje (inclui hoje), limitados aos comprometidos. */
export function elapsedDays(p: Period, today: string = dbToday()): number {
  if (toDay(today) < toDay(p.startsOn)) return 0;
  return Math.min(committedDays(p), toDay(today) - toDay(p.startsOn) + 1);
}

/** Menor data de parada aceita: hoje já está pago, então a parada vale de amanhã (ou do início, se futuro). */
export function earliestStop(p: Pick<Period, 'startsOn'>, today: string = dbToday()): string {
  const tomorrow = addDays(today, 1);
  return toDay(p.startsOn) > toDay(tomorrow) ? p.startsOn : tomorrow;
}

/** Quanto volta ao saldo se parar na data (ou no menor dia possível). */
export function refundIfStopped(dailyCents: number, p: Period, today: string = dbToday()): number {
  const stop = earliestStop(p, today);
  const before = costCents(dailyCents, p);
  const after = costCents(dailyCents, { ...p, stoppedOn: stop });
  return Math.max(0, before - after);
}

export type Situation = 'scheduled' | 'live' | 'stopped' | 'ended';

export function situation(p: Period, today: string = dbToday()): Situation {
  const t = toDay(today);
  if (p.stoppedOn && toDay(p.stoppedOn) <= t) return 'stopped';
  if (t > toDay(p.endsOn)) return 'ended';
  if (t < toDay(p.startsOn)) return 'scheduled';
  return 'live';
}

export type PeriodCheck = { ok: true } | { ok: false; reason: string };

/** Mesmas regras do banco (CHECKs + policy de INSERT), com mensagem para o formulário. */
export function validateNewPeriod(
  a: { dailyCents: number; startsOn: string; endsOn: string; balanceCents: number },
  today: string = dbToday(),
): PeriodCheck {
  if (!Number.isInteger(a.dailyCents) || a.dailyCents < MIN_DAILY_CENTS || a.dailyCents > MAX_DAILY_CENTS) {
    return { ok: false, reason: `A diária deve ficar entre ${formatBRL(MIN_DAILY_CENTS)} e ${formatBRL(MAX_DAILY_CENTS)}.` };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a.startsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(a.endsOn)) {
    return { ok: false, reason: 'Informe as datas de início e fim.' };
  }
  if (toDay(a.startsOn) < toDay(today)) return { ok: false, reason: 'O início não pode ser no passado.' };
  const days = periodDays(a);
  if (days === 0) return { ok: false, reason: 'O fim não pode ser antes do início.' };
  if (days > MAX_PERIOD_DAYS) return { ok: false, reason: `O período máximo é de ${MAX_PERIOD_DAYS} dias.` };
  const total = costCents(a.dailyCents, a);
  if (total > a.balanceCents) {
    return { ok: false, reason: `Saldo insuficiente: o período custa ${formatBRL(total)} e você tem ${formatBRL(a.balanceCents)}.` };
  }
  return { ok: true };
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** "12,50" / "12.5" / "R$ 1.250,00" → centavos (NaN se não for número). */
export function parseBRLToCents(text: string): number {
  const cleaned = text.replace(/[^\d,.-]/g, '');
  if (!cleaned) return NaN;
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned;
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}
