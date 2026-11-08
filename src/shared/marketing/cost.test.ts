import { describe, expect, it } from 'vitest';
import {
  addDays,
  committedDays,
  costCents,
  earliestStop,
  elapsedDays,
  parseBRLToCents,
  periodDays,
  refundIfStopped,
  situation,
  validateNewPeriod,
} from './cost';

const p = { startsOn: '2026-12-01', endsOn: '2026-12-07' };

describe('custo por período', () => {
  it('conta início e fim', () => {
    expect(periodDays(p)).toBe(7);
    expect(periodDays({ startsOn: '2026-12-07', endsOn: '2026-12-01' })).toBe(0);
  });

  it('custo = diária × dias comprometidos', () => {
    expect(costCents(1000, p)).toBe(7000);
  });

  it('parar devolve os dias não usados (stopped_on = primeiro dia NÃO servido)', () => {
    expect(committedDays({ ...p, stoppedOn: '2026-12-04' })).toBe(3);
    expect(costCents(1000, { ...p, stoppedOn: '2026-12-04' })).toBe(3000);
    expect(committedDays({ ...p, stoppedOn: '2026-12-01' })).toBe(0);
    expect(committedDays({ ...p, stoppedOn: '2026-12-08' })).toBe(7);
  });

  it('hoje já está pago: a parada mais cedo vale de amanhã', () => {
    expect(earliestStop(p, '2026-12-03')).toBe('2026-12-04');
    // campanha futura: devolve tudo
    expect(earliestStop({ startsOn: '2026-12-20' }, '2026-12-03')).toBe('2026-12-20');
    expect(refundIfStopped(1000, p, '2026-12-03')).toBe(4000);
    expect(refundIfStopped(1000, { startsOn: '2026-12-20', endsOn: '2026-12-22' }, '2026-12-03')).toBe(3000);
  });

  it('dias consumidos até hoje', () => {
    expect(elapsedDays(p, '2026-11-30')).toBe(0);
    expect(elapsedDays(p, '2026-12-03')).toBe(3);
    expect(elapsedDays(p, '2027-01-01')).toBe(7);
    expect(elapsedDays({ ...p, stoppedOn: '2026-12-03' }, '2026-12-06')).toBe(2);
  });

  it('situação', () => {
    expect(situation(p, '2026-11-30')).toBe('scheduled');
    expect(situation(p, '2026-12-03')).toBe('live');
    expect(situation(p, '2026-12-08')).toBe('ended');
    expect(situation({ ...p, stoppedOn: '2026-12-04' }, '2026-12-04')).toBe('stopped');
    expect(situation({ ...p, stoppedOn: '2026-12-04' }, '2026-12-03')).toBe('live');
  });

  it('addDays atravessa o mês', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
  });
});

describe('validateNewPeriod', () => {
  const base = { dailyCents: 1000, startsOn: '2026-12-01', endsOn: '2026-12-07', balanceCents: 7000 };
  it('aceita quando o saldo cobre', () => {
    expect(validateNewPeriod(base, '2026-12-01').ok).toBe(true);
  });
  it('recusa saldo insuficiente, passado, diária fora da faixa e período longo', () => {
    expect(validateNewPeriod({ ...base, balanceCents: 6999 }, '2026-12-01').ok).toBe(false);
    expect(validateNewPeriod(base, '2026-12-02').ok).toBe(false);
    expect(validateNewPeriod({ ...base, dailyCents: 100 }, '2026-12-01').ok).toBe(false);
    expect(validateNewPeriod({ ...base, endsOn: '2027-03-30', balanceCents: 1e9 }, '2026-12-01').ok).toBe(false);
    expect(validateNewPeriod({ ...base, endsOn: '2026-11-30' }, '2026-11-01').ok).toBe(false);
  });
});

describe('parseBRLToCents', () => {
  it('lê formatos brasileiros', () => {
    expect(parseBRLToCents('12,50')).toBe(1250);
    expect(parseBRLToCents('R$ 1.250,00')).toBe(125000);
    expect(parseBRLToCents('12.5')).toBe(1250);
    expect(Number.isNaN(parseBRLToCents('abc'))).toBe(true);
  });
});
