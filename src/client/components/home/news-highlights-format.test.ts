import { describe, it, expect } from 'vitest';
import {
  formatNewsAbsolute,
  formatNewsFull,
  formatNewsRelative,
  kickerHue,
  kickerTone,
  parseNewsDate,
} from './news-highlights-format';

describe('kickerHue / kickerTone', () => {
  it('é determinística e ignora acento, caixa e espaços', () => {
    expect(kickerHue('Política')).toBe(kickerHue('politica'));
    expect(kickerHue('  POLÍTICA ')).toBe(kickerHue('Política'));
    expect(kickerHue('Esportes')).toBe(kickerHue('Esportes'));
  });

  it('fica em faixas de 15 graus entre 0 e 345', () => {
    for (const k of ['Política', 'Esportes', 'Cidade', 'Cultura & Entretenimento', 'História', '']) {
      const h = kickerHue(k);
      expect(h % 15).toBe(0);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(360);
    }
  });

  it('separa chapéus diferentes do mesmo portal', () => {
    const hues = new Set(['Política', 'Esportes', 'Cidade', 'História', 'Geografia'].map(kickerHue));
    expect(hues.size).toBeGreaterThanOrEqual(4);
  });

  it('o texto mistura o matiz com --foreground (claro/escuro automático)', () => {
    const tone = kickerTone('Política');
    expect(tone.hue).toBe(kickerHue('Política'));
    expect(tone.text).toContain('var(--foreground)');
    expect(tone.text).toContain(` ${tone.hue})`);
    expect(tone.solid).toBe(`oklch(0.64 0.19 ${tone.hue})`);
    expect(tone.wash).toContain('var(--card)');
  });
});

describe('parseNewsDate', () => {
  it('ISO com fuso é usado como veio', () => {
    expect(parseNewsDate('2026-10-13T14:30:00Z')?.toISOString()).toBe('2026-10-13T14:30:00.000Z');
    expect(parseNewsDate('2026-10-13T10:30:00-04:00')?.toISOString()).toBe('2026-10-13T14:30:00.000Z');
  });

  it('data local sem fuso é lida no fuso pedido', () => {
    expect(parseNewsDate('2026-10-13T10:30', 'America/Cuiaba')?.toISOString()).toBe(
      '2026-10-13T14:30:00.000Z'
    );
    expect(parseNewsDate('2026-10-13T11:30')?.toISOString()).toBe('2026-10-13T14:30:00.000Z');
    expect(parseNewsDate('2026-10-13', 'UTC')?.toISOString()).toBe('2026-10-13T00:00:00.000Z');
  });

  it('vazio ou inválido vira null', () => {
    expect(parseNewsDate(null)).toBeNull();
    expect(parseNewsDate('')).toBeNull();
    expect(parseNewsDate('ontem')).toBeNull();
    expect(parseNewsDate(new Date('x'))).toBeNull();
  });
});

describe('formatação de tempo', () => {
  const date = new Date('2026-10-13T14:30:00Z'); // 11:30 em São Paulo
  const at = (iso: string) => Date.parse(iso);

  it('absoluta é determinística (não depende de agora)', () => {
    expect(formatNewsAbsolute(date)).toBe('13 out, 11:30');
    expect(formatNewsAbsolute(date, 'America/Cuiaba')).toBe('13 out, 10:30');
    expect(formatNewsFull(date)).toBe('13 de outubro de 2026, 11:30');
  });

  it('relativa em pt-BR', () => {
    expect(formatNewsRelative(date, at('2026-10-13T14:30:20Z'))).toBe('agora');
    expect(formatNewsRelative(date, at('2026-10-13T14:42:00Z'))).toBe('há 12 min');
    expect(formatNewsRelative(date, at('2026-10-13T17:31:00Z'))).toBe('há 3 h');
    expect(formatNewsRelative(date, at('2026-10-14T20:00:00Z'))).toBe('ontem');
    expect(formatNewsRelative(date, at('2026-10-17T15:00:00Z'))).toBe('há 4 dias');
  });

  it('uma semana ou mais, ou futuro, vira data curta', () => {
    expect(formatNewsRelative(date, at('2026-10-25T00:00:00Z'))).toBe('13 out');
    expect(formatNewsRelative(date, at('2027-02-01T00:00:00Z'))).toBe('13 out 2026');
    expect(formatNewsRelative(date, at('2026-10-12T00:00:00Z'))).toBe('13 out');
  });
});
