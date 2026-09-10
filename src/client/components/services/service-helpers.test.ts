import { describe, it, expect } from 'vitest';
import { coverImage, formatServicePrice, fileUrl } from './service-helpers';

describe('coverImage', () => {
  it('returns null when there is no image', () => {
    expect(coverImage({ extras: {} })).toBeNull();
    expect(coverImage({ extras: { images: [] } })).toBeNull();
    expect(coverImage({ extras: { coverFileId: '' } })).toBeNull();
  });

  it('uses extras.coverFileId when present', () => {
    expect(coverImage({ extras: { coverFileId: 42 } })).toBe(fileUrl(42));
    expect(coverImage({ extras: { coverFileId: 42, images: [7, 8] } })).toBe(fileUrl(42));
  });

  it('falls back to the first of extras.images', () => {
    expect(coverImage({ extras: { images: [7, 8] } })).toBe(fileUrl(7));
  });
});

describe('formatServicePrice', () => {
  it('returns "Sob consulta" for quote or a falsy price', () => {
    expect(formatServicePrice(0, 'quote')).toBe('Sob consulta');
    expect(formatServicePrice(50, 'quote')).toBe('Sob consulta');
    expect(formatServicePrice(0, 'hour')).toBe('Sob consulta');
  });

  it('formats a real price with the unit label', () => {
    const out = formatServicePrice(50, 'hour');
    expect(out).toContain('50,00');
    expect(out).toContain('·');
    expect(out).toContain('por hora');
  });

  it('falls back to the raw unit when unknown', () => {
    expect(formatServicePrice(50, 'weird_unit')).toContain('weird_unit');
  });
});
