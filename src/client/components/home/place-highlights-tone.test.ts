import { describe, expect, it } from 'vitest';
import {
  PLACE_TONE_HUES,
  normalizePlaceKicker,
  placeKickerHue,
  placeTone,
} from './place-highlights-tone';

describe('placeKickerHue', () => {
  it('é determinística e sai da paleta', () => {
    for (const k of ['Shopping', 'Casa de festas', 'Casa noturna', 'Estádio e arenas', 'x']) {
      const hue = placeKickerHue(k);
      expect(placeKickerHue(k)).toBe(hue);
      expect(PLACE_TONE_HUES).toContain(hue);
    }
  });

  it('ignora caixa, acento e espaços extras', () => {
    expect(placeKickerHue('SHOPPING')).toBe(placeKickerHue('Shopping'));
    expect(placeKickerHue('  casa   de festas ')).toBe(placeKickerHue('Casa de festas'));
    expect(placeKickerHue('Estadio e arenas')).toBe(placeKickerHue('Estádio e arenas'));
  });

  it('distribui grupos diferentes em cores diferentes', () => {
    const hues = new Set(
      ['Shopping', 'Casa de festas', 'Casa noturna', 'Estádio e arenas', 'Parque', 'Mirante', 'Bar', 'Museu'].map(
        placeKickerHue
      )
    );
    expect(hues.size).toBeGreaterThanOrEqual(4);
  });
});

describe('normalizePlaceKicker', () => {
  it('tira acento e normaliza espaços', () => {
    expect(normalizePlaceKicker('  Estádio   E Arenas ')).toBe('estadio e arenas');
  });
});

describe('placeTone', () => {
  it('monta as cores com a matiz do grupo e segue o tema via --foreground', () => {
    const tone = placeTone('Shopping');
    expect(tone.hue).toBe(placeKickerHue('Shopping'));
    expect(tone.ink).toContain(`oklch(0.62 0.17 ${tone.hue})`);
    expect(tone.ink).toContain('var(--foreground)');
    expect(tone.solid).toBe(`oklch(0.5 0.15 ${tone.hue})`);
    expect(tone.wash).toMatch(/^linear-gradient\(/);
  });
});
