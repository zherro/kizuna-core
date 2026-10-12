import { describe, it, expect } from 'vitest';
import { variantCardProps } from './event-card';

describe('variantCardProps', () => {
  it('evento: preço "A partir de", data e CTA', () => {
    const p = variantCardProps('evento', { startingPrice: 40, priceUnit: 'event', startsAt: '2026-11-14T20:00' });
    expect(p).toMatchObject({ cardStyle: 'evento', ctaLabel: 'Ver evento', priceCaption: 'A partir de' });
    expect(p?.priceLabel?.replace(/\s/g, ' ')).toBe('R$ 40,00');
    expect(p?.dateLabel).toEqual({ day: '14', month: 'nov' });
  });

  it('evento: Gratuito e Sob consulta', () => {
    expect(variantCardProps('evento', { free: true, startingPrice: 40 })).toMatchObject({
      priceLabel: 'Gratuito',
      priceCaption: null,
      dateLabel: null,
    });
    expect(variantCardProps('evento', { startingPrice: null })?.priceLabel).toBe('Sob consulta');
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
