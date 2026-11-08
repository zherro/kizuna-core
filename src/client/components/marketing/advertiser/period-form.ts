import {
  addDays,
  costCents,
  dbToday,
  parseBRLToCents,
  validateNewPeriod,
  type PeriodCheck,
} from '../../../../shared/marketing/cost';

export type PeriodDraft = { dailyText: string; startsOn: string; endsOn: string };

export type PeriodEval = {
  dailyCents: number;
  totalCents: number;
  /** Saldo depois de reservar o período (pode ficar negativo — aí `check` recusa). */
  balanceAfterCents: number;
  check: PeriodCheck;
};

export function defaultDraft(today: string = dbToday()): PeriodDraft {
  return { dailyText: '10,00', startsOn: today, endsOn: addDays(today, 6) };
}

/** Mesma conta que o banco faz na policy de INSERT, para avisar antes de enviar. */
export function evaluatePeriod(d: PeriodDraft, balanceCents: number, today: string = dbToday()): PeriodEval {
  const raw = parseBRLToCents(d.dailyText);
  const dailyCents = Number.isFinite(raw) ? raw : 0;
  const totalCents = d.startsOn && d.endsOn ? costCents(dailyCents, d) : 0;
  const check = Number.isFinite(raw)
    ? validateNewPeriod({ dailyCents, startsOn: d.startsOn, endsOn: d.endsOn, balanceCents }, today)
    : ({ ok: false, reason: 'Digite a diária, por exemplo 10,00.' } as PeriodCheck);
  return { dailyCents, totalCents, balanceAfterCents: balanceCents - totalCents, check };
}
