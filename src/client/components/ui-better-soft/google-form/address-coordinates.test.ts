import { describe, expect, it } from 'vitest';
import { parseCoordinate, splitCoordinatePair } from './address-google-form';

describe('parseCoordinate', () => {
  it('aceita ponto ou vírgula decimal', () => {
    expect(parseCoordinate('-15.6014')).toBe(-15.6014);
    expect(parseCoordinate(' -15,6014 ')).toBe(-15.6014);
  });
  it('vazio ou texto vira null', () => {
    expect(parseCoordinate('')).toBeNull();
    expect(parseCoordinate('abc')).toBeNull();
  });
});

describe('splitCoordinatePair', () => {
  it('separa o par copiado do Google Maps', () => {
    expect(splitCoordinatePair('-15.6014, -56.0979')).toEqual(['-15.6014', '-56.0979']);
    expect(splitCoordinatePair('-15.6014 -56.0979')).toEqual(['-15.6014', '-56.0979']);
  });
  it('um número só não é par', () => {
    expect(splitCoordinatePair('-15.6014')).toBeNull();
  });
});
