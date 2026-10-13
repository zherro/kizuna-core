import { describe, it, expect } from 'vitest';
import { variantCardProps } from './event-card';

describe('variantCardProps', () => {
  it('evento: data no lugar do valor, sem preço', () => {
    const p = variantCardProps('evento', { startingPrice: 40, priceUnit: 'unit', startsAt: '2026-11-14T20:00' });
    expect(p).toMatchObject({ cardStyle: 'evento', ctaLabel: 'Ver evento', priceLabel: null, priceCaption: null });
    expect(p?.dateLabel).toEqual({ day: '14', month: 'nov' });
    expect(p?.whenLabel).toMatch(/14 de nov.*20:00/);
  });

  it('evento: sem data de início não mostra data nem valor', () => {
    expect(variantCardProps('evento', { free: true, startingPrice: 40 })).toMatchObject({
      priceLabel: null,
      dateLabel: null,
      whenLabel: null,
    });
  });

  it('cinema: sem preço; demais variants: null', () => {
    expect(variantCardProps('cinema')).toMatchObject({
      cardStyle: 'cinema',
      priceLabel: null,
      ctaLabel: 'Onde assistir',
    });
    expect(variantCardProps('service')).toBeNull();
  });
});
