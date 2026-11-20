import { describe, expect, it } from 'vitest';
import { FOREIGN_IP_FALLBACK, ipDetectionTarget } from './ip-detect';

describe('ipDetectionTarget', () => {
  it('sem resposta: null (resolve sem UF = cidade padrão)', () => {
    expect(ipDetectionTarget(null)).toBeNull();
    expect(ipDetectionTarget(undefined)).toBeNull();
  });

  it('IP do Brasil com UF: UF + cidade do provedor', () => {
    expect(ipDetectionTarget({ countryCode: 'BR', stateCode: 'MT', cityName: 'Cuiabá' })).toEqual({
      stateCode: 'MT',
      cityName: 'Cuiabá',
    });
  });

  it('país da região sem UF: null', () => {
    expect(ipDetectionTarget({ countryCode: 'BR' })).toBeNull();
  });

  it('fora da América Latina (ou sem país): São Paulo', () => {
    expect(ipDetectionTarget({ countryCode: 'US', stateCode: 'CA', cityName: 'Mountain View' })).toEqual(
      FOREIGN_IP_FALLBACK
    );
    expect(ipDetectionTarget({ stateCode: 'MT' })).toEqual(FOREIGN_IP_FALLBACK);
  });
});
