import { describe, expect, it } from 'vitest';
import { normalizeUtm, normalizeUtmSource, normalizeUtmValue, parseUtmFromSearch, UTM_PATTERN } from './utm';

describe('normalizeUtmValue', () => {
  it('minúsculas, sem acento, espaço vira _, só [a-z0-9_.-]', () => {
    expect(normalizeUtmValue('  Agenda Quinta  ')).toBe('agenda_quinta');
    expect(normalizeUtmValue('São João+2026')).toBe('sao_joao_2026');
    expect(normalizeUtmValue('promo!@#$%verão')).toBe('promoverao');
    expect(normalizeUtmValue('stories.ig-01')).toBe('stories.ig-01');
  });

  it('corta pontuação nas pontas e limita a 64', () => {
    expect(normalizeUtmValue('--x--')).toBe('x');
    expect(normalizeUtmValue('a'.repeat(100))).toHaveLength(64);
    expect(normalizeUtmValue(`${'a'.repeat(63)}-b`)).toBe('a'.repeat(63));
  });

  it('vazio, só símbolos ou não-string = undefined', () => {
    expect(normalizeUtmValue('')).toBeUndefined();
    expect(normalizeUtmValue('!!!')).toBeUndefined();
    expect(normalizeUtmValue(null)).toBeUndefined();
    expect(normalizeUtmValue(42)).toBeUndefined();
  });

  it('o resultado sempre casa com o CHECK do banco', () => {
    for (const raw of ['ÁÉÍ óú', 'a b c', '<script>', 'x'.repeat(200), 'Insta_Story.1']) {
      const v = normalizeUtmValue(raw);
      if (v) expect(v).toMatch(UTM_PATTERN);
    }
  });
});

describe('normalizeUtmSource', () => {
  it('aplica apelidos comuns', () => {
    expect(normalizeUtmSource('IG')).toBe('instagram');
    expect(normalizeUtmSource('insta')).toBe('instagram');
    expect(normalizeUtmSource('l.instagram.com')).toBe('instagram');
    expect(normalizeUtmSource('wa')).toBe('whatsapp');
    expect(normalizeUtmSource('Zap')).toBe('whatsapp');
    expect(normalizeUtmSource('wpp')).toBe('whatsapp');
    expect(normalizeUtmSource('fb')).toBe('facebook');
    expect(normalizeUtmSource('www.facebook.com')).toBe('facebook');
  });

  it('origem desconhecida fica normalizada como veio', () => {
    expect(normalizeUtmSource('Newsletter')).toBe('newsletter');
    expect(normalizeUtmSource('radio_cbn')).toBe('radio_cbn');
  });
});

describe('parseUtmFromSearch / normalizeUtm', () => {
  it('lê os três campos da query', () => {
    expect(parseUtmFromSearch('?utm_source=ig&utm_medium=Social&utm_campaign=Agenda%20Quinta&x=1')).toEqual({
      source: 'instagram',
      medium: 'social',
      campaign: 'agenda_quinta',
    });
  });

  it('sem utm válido = null; campo inválido some', () => {
    expect(parseUtmFromSearch('?q=pizza')).toBeNull();
    expect(parseUtmFromSearch('?utm_source=%21%21')).toBeNull();
    expect(parseUtmFromSearch('?utm_source=!!&utm_campaign=x')).toEqual({ campaign: 'x' });
    expect(normalizeUtm(null)).toBeNull();
    expect(normalizeUtm({ source: 1, medium: {}, campaign: [] })).toBeNull();
  });
});
