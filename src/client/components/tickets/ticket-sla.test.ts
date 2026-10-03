import { describe, expect, it } from 'vitest';
import { addBusinessDays, slaDueAt, URGENT_SUBJECT } from './ticket-sla';

describe('ticket-sla', () => {
  it('pula o fim de semana: sexta + 3 dias úteis = quarta', () => {
    const friday = new Date('2026-10-02T15:00:00Z');
    expect(addBusinessDays(friday, 3).toISOString()).toBe('2026-10-07T15:00:00.000Z');
  });

  it('segunda + 3 dias úteis = quinta', () => {
    expect(addBusinessDays(new Date('2026-10-05T12:00:00Z'), 3).toISOString()).toBe(
      '2026-10-08T12:00:00.000Z'
    );
  });

  it('denúncia tem prazo de 1 dia útil; o resto, 3', () => {
    const monday = new Date('2026-10-05T12:00:00Z');
    expect(slaDueAt(URGENT_SUBJECT, monday)).toBe('2026-10-06T12:00:00.000Z');
    expect(slaDueAt('Conta e acesso', monday)).toBe('2026-10-08T12:00:00.000Z');
  });
});
