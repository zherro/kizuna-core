import { describe, it, expect } from 'vitest';
import { dayKey, dayLabel, groupByDay } from './day-label';

const now = new Date('2026-09-08T12:00:00');

describe('dayLabel', () => {
  it('hoje / ontem por extenso', () => {
    expect(dayLabel('2026-09-08T09:30:00', now)).toBe('Hoje');
    expect(dayLabel('2026-09-07T23:59:00', now)).toBe('Ontem');
  });

  it('mesma data, ano corrente: sem o ano', () => {
    expect(dayLabel('2026-09-01T10:00:00', now)).toBe('1 de setembro');
  });

  it('ano diferente: inclui o ano', () => {
    expect(dayLabel('2025-12-25T10:00:00', now)).toBe('25 de dezembro de 2025');
  });
});

describe('groupByDay', () => {
  it('agrupa consecutivos do mesmo dia e mantém a ordem', () => {
    const items = [
      { createdAt: '2026-09-07T10:00:00' },
      { createdAt: '2026-09-07T18:00:00' },
      { createdAt: '2026-09-08T09:00:00' },
    ];
    const groups = groupByDay(items);
    expect(groups.map((g) => g.key)).toEqual(['2026-09-07', '2026-09-08']);
    expect(groups[0].items).toHaveLength(2);
    expect(groups[1].items).toHaveLength(1);
  });

  it('dayKey é local e estável', () => {
    expect(dayKey('2026-09-08T00:00:00')).toBe('2026-09-08');
  });
});
