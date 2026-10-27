import { describe, expect, it } from 'vitest';
import {
  bentoTileKind,
  columnTileHeight,
  mosaicDaySeed,
  pickSurprise,
  resolveMosaicVariant,
  stripTileIsWide,
  uniqueKickers,
} from './place-mosaic-layout';

describe('resolveMosaicVariant', () => {
  it('respeita a variante explícita', () => {
    expect(resolveMosaicVariant('bento', 1)).toBe('bento');
    expect(resolveMosaicVariant('columns', 9, 'x')).toBe('columns');
  });
  it('auto é determinístico e com poucos itens usa strips', () => {
    expect(resolveMosaicVariant('auto', 3, 'a')).toBe('strips');
    expect(resolveMosaicVariant('auto', 4, 'a')).toBe('bento');
    expect(resolveMosaicVariant('auto', 8, '2026-10-25')).toBe(resolveMosaicVariant('auto', 8, '2026-10-25'));
  });
  it('auto gira entre as três variantes conforme a semente', () => {
    const seen = new Set(Array.from({ length: 40 }, (_, i) => resolveMosaicVariant('auto', 8, `d${i}`)));
    expect(seen).toEqual(new Set(['bento', 'columns', 'strips']));
  });
});

describe('mosaicDaySeed', () => {
  it('usa o dia no fuso', () => {
    expect(mosaicDaySeed(new Date('2026-10-25T02:00:00Z'))).toBe('2026-10-24');
    expect(mosaicDaySeed(new Date('2026-10-25T12:00:00Z'))).toBe('2026-10-25');
  });
});

describe('padrões de peças', () => {
  it('altura da coluna é estável por título e varia', () => {
    expect(columnTileHeight('Arena')).toBe(columnTileHeight(' arena '));
    const set = new Set(Array.from({ length: 30 }, (_, i) => columnTileHeight(`Lugar ${i}`)));
    expect(set.size).toBe(3);
  });
  it('bento: 1 grande, 1 larga, 2 altas e depois larga+2 pequenas', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(bentoTileKind)).toEqual([
      'hero', 'wide', 'tall', 'tall', 'wide', 'small', 'small', 'wide',
    ]);
  });
  it('strips alterna o destaque de lado (2-1-1 / 1-1-2)', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(stripTileIsWide)).toEqual([true, false, false, false, false, true, true]);
  });
});

describe('uniqueKickers e pickSurprise', () => {
  it('agrupa por texto normalizado, mantendo a ordem', () => {
    expect(uniqueKickers([{ kicker: 'Shopping' }, { kicker: ' shopping ' }, { kicker: 'Bar' }])).toEqual([
      { key: 'shopping', label: 'Shopping' },
      { key: 'bar', label: 'Bar' },
    ]);
  });
  const list = [{ href: 'a' }, { href: 'b' }, { href: 'c' }];
  it('sorteia com rng injetado e evita repetir o anterior', () => {
    expect(pickSurprise(list, () => 0)?.href).toBe('a');
    expect(pickSurprise(list, () => 0.999)?.href).toBe('c');
    expect(pickSurprise(list, () => 0, 'a')?.href).toBe('b');
    expect(pickSurprise([{ href: 'a' }], () => 0, 'a')?.href).toBe('a');
    expect(pickSurprise([])).toBeNull();
  });
});
