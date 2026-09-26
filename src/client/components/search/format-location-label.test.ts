import { describe, expect, it } from 'vitest';
import { formatLocationLabel } from './format-location-label';

describe('formatLocationLabel', () => {
  it('cidade simples', () => expect(formatLocationLabel({ city: 'Cuiabá', state: 'MT', address_count: 1 })).toBe('Cuiabá'));
  it('cidade com endereços extras', () => expect(formatLocationLabel({ city: 'Cuiabá', address_count: 3 })).toBe('Cuiabá +2'));
  it('sem cidade usa UF', () => expect(formatLocationLabel({ city: null, state: 'MT', address_count: 2 })).toBe('MT +1'));
  it('vazio ou retrocompatível', () => {
    expect(formatLocationLabel({})).toBeNull();
    expect(formatLocationLabel({ city: ' ', state: '' })).toBeNull();
    expect(formatLocationLabel({ city: 'Cuiabá' })).toBe('Cuiabá');
  });
});
