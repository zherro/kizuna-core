import { describe, it, expect } from 'vitest';
import { variantCardProps } from './event-card';

describe('variantCardProps', () => {
  it('evento: data no lugar do valor, sem preço', () => {
    const p = variantCardProps('evento', { startingPrice: 40, priceUnit: 'unit', startsAt: '2026-11-14T20:00' });
    expect(p).toMatchObject({ cardStyle: 'evento', ctaLabel: 'Ver evento', priceLabel: null, priceCaption: null });
    expect(p?.dateLabel).toEqual({ day: '14', month: 'nov' });
    expect(p?.whenLabel).toMatch(/14 de nov.*20:00/);
  });

  it('evento: o "Acontece em" (expires_at) manda sobre a data do formulário', () => {
    const p = variantCardProps('evento', {
      startsAt: '2026-11-01T20:00',
      expiresAt: '2026-11-15T03:59:59.999Z', // 14/11 23:59 em Cuiabá
    });
    expect(p?.dateLabel).toEqual({ day: '14', month: 'nov' });
    expect(p?.whenLabel).toMatch(/14 de nov/);
    expect(p?.whenLabel).not.toMatch(/\d{2}:\d{2}/); // fim do dia não é horário do evento
  });

  it('evento: com hora de início no expires_at, o rótulo ganha "· HH:MM"', () => {
    const p = variantCardProps('evento', { expiresAt: '2026-11-15T03:00:00.000Z' }); // 14/11 23:00 em Cuiabá
    expect(p?.dateLabel).toEqual({ day: '14', month: 'nov' });
    expect(p?.whenLabel).toMatch(/14 de nov.* · 23:00$/);
  });

  it('evento: sem expires_at cai na data de início do formulário', () => {
    const p = variantCardProps('evento', { startsAt: '2026-11-14T20:00', expiresAt: null });
    expect(p?.dateLabel).toEqual({ day: '14', month: 'nov' });
    expect(p?.whenLabel).toMatch(/20:00/);
  });

  it('evento: local sempre com a cidade ("Local · Cidade")', () => {
    expect(variantCardProps('evento', { venue: 'Arena Pantanal', place: 'Cuiabá' })?.locationLabel).toBe(
      'Arena Pantanal · Cuiabá'
    );
    expect(variantCardProps('evento', { place: 'Cuiabá +2' })?.locationLabel).toBe('Cuiabá +2');
    expect(variantCardProps('evento', {})).not.toHaveProperty('locationLabel');
  });

  it('evento: sem data de início não mostra data nem valor', () => {
    expect(variantCardProps('evento', { free: true, startingPrice: 40 })).toMatchObject({
      priceLabel: null,
      dateLabel: null,
      whenLabel: null,
    });
  });

  it('lugar: sem preço, sem data, CTA "Ver lugar"', () => {
    expect(variantCardProps('lugar', { startingPrice: 40, priceUnit: 'unit' })).toMatchObject({
      cardStyle: 'lugar',
      ctaLabel: 'Ver lugar',
      priceLabel: null,
      priceCaption: null,
      dateLabel: null,
    });
  });

  it('noticia: sem preço nem gratuito, CTA "Ler notícia"', () => {
    expect(variantCardProps('noticia', { startingPrice: 40, priceUnit: 'unit', free: true })).toEqual({
      cardStyle: 'lugar',
      ctaLabel: 'Ler notícia',
      priceLabel: null,
      priceCaption: null,
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
