import { describe, expect, it } from 'vitest';
import { pickServiceCity } from './service-city';
import type { RoutableCity } from '../../shared/city-routing/city-slug';

const CUIABA: RoutableCity = { ibge: '5103403', name: 'Cuiabá', state: 'MT', stateName: 'Mato Grosso' };
const VG: RoutableCity = { ibge: '5108402', name: 'Várzea Grande', state: 'MT', stateName: 'Mato Grosso' };
const CITIES = [CUIABA, VG];

describe('pickServiceCity', () => {
  it('prefere o endereço principal', () => {
    const city = pickServiceCity(
      [
        { cityIbge: '5103403', isPrimary: false },
        { cityIbge: '5108402', isPrimary: true },
      ],
      null,
      CITIES
    );
    expect(city).toBe(VG);
  });

  it('aceita as colunas em snake_case', () => {
    expect(pickServiceCity([{ city_ibge: '5103403', is_primary: true }], null, CITIES)).toBe(CUIABA);
  });

  it('ignora endereço fora da lista e cai no próximo', () => {
    const city = pickServiceCity(
      [
        { cityIbge: '3550308', isPrimary: true },
        { cityIbge: '5103403', isPrimary: false },
      ],
      null,
      CITIES
    );
    expect(city).toBe(CUIABA);
  });

  it('sem endereço usa a cidade do prestador (nome + UF)', () => {
    expect(pickServiceCity([], { city: 'cuiaba', state: 'mt' }, CITIES)).toBe(CUIABA);
  });

  it('sem nenhuma pista devolve null', () => {
    expect(pickServiceCity([], null, CITIES)).toBeNull();
    expect(pickServiceCity([], { city: 'Sinop', state: 'MT' }, CITIES)).toBeNull();
  });
});
