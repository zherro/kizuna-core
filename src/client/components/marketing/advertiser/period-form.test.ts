import { describe, expect, it } from 'vitest';
import { defaultDraft, evaluatePeriod } from './period-form';

describe('evaluatePeriod', () => {
  const today = '2026-12-01';

  it('padrão: 7 dias a partir de hoje', () => {
    expect(defaultDraft(today)).toEqual({ dailyText: '10,00', startsOn: '2026-12-01', endsOn: '2026-12-07' });
  });

  it('aprova quando o saldo cobre e mostra o saldo depois', () => {
    const e = evaluatePeriod(defaultDraft(today), 10000, today);
    expect(e.check.ok).toBe(true);
    expect(e.totalCents).toBe(7000);
    expect(e.balanceAfterCents).toBe(3000);
  });

  it('recusa saldo insuficiente com a conta na mensagem', () => {
    const e = evaluatePeriod(defaultDraft(today), 6999, today);
    expect(e.check.ok).toBe(false);
    expect(e.balanceAfterCents).toBe(-1);
    if (!e.check.ok) expect(e.check.reason).toContain('Saldo insuficiente');
  });

  it('diária ilegível não passa', () => {
    expect(evaluatePeriod({ ...defaultDraft(today), dailyText: 'abc' }, 1e6, today).check.ok).toBe(false);
  });

  it('diária abaixo do mínimo não passa', () => {
    expect(evaluatePeriod({ ...defaultDraft(today), dailyText: '1,00' }, 1e6, today).check.ok).toBe(false);
  });
});
