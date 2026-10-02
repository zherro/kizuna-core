import { describe, expect, it } from 'vitest';
import {
  CITY_COOKIE,
  cityPath,
  citySlug,
  findCityByIbge,
  findCityByNameState,
  findCityBySlug,
  isRoutableSlug,
  serviceHref,
  type RoutableCity,
} from './city-slug';

const CUIABA: RoutableCity = { ibge: '5103403', name: 'Cuiabá', state: 'MT', stateName: 'Mato Grosso' };
const VG: RoutableCity = { ibge: '5108402', name: 'Várzea Grande', state: 'MT', stateName: 'Mato Grosso' };
const CITIES = [CUIABA, VG];

describe('citySlug', () => {
  it('tira acento, minusculiza e sufixa a UF', () => {
    expect(citySlug('Cuiabá', 'MT')).toBe('cuiaba-mt');
    expect(citySlug('Várzea Grande', 'MT')).toBe('varzea-grande-mt');
    expect(citySlug("Alta Floresta D'Oeste", 'ro')).toBe('alta-floresta-d-oeste-ro');
  });
});

describe('isRoutableSlug', () => {
  it('aceita cidade-uf e rejeita reservados e formatos inválidos', () => {
    expect(isRoutableSlug('cuiaba-mt')).toBe(true);
    expect(isRoutableSlug('cuiaba')).toBe(false);
    expect(isRoutableSlug('busca')).toBe(false);
    expect(isRoutableSlug('registre-se')).toBe(false);
    expect(isRoutableSlug('Cuiaba-MT')).toBe(false);
    expect(isRoutableSlug('')).toBe(false);
  });
});

describe('cityPath', () => {
  it('monta o caminho com sufixo opcional', () => {
    expect(cityPath(CUIABA)).toBe('/cuiaba-mt');
    expect(cityPath(CUIABA, '/anuncio/abc')).toBe('/cuiaba-mt/anuncio/abc');
  });
});

describe('serviceHref', () => {
  it('usa o caminho canônico quando há cidade e UF, senão o legado', () => {
    expect(serviceHref({ uid: 'abc', city: 'Cuiabá', state: 'MT' })).toBe('/cuiaba-mt/anuncio/abc');
    expect(serviceHref({ uid: 'abc', city: null, state: 'MT' })).toBe('/anuncios/abc');
    expect(serviceHref({ uid: 'abc' })).toBe('/anuncios/abc');
  });
});

describe('buscas na lista', () => {
  it('acha por slug, ibge e nome+UF (sem acento/caixa)', () => {
    expect(findCityBySlug(CITIES, 'varzea-grande-mt')).toBe(VG);
    expect(findCityBySlug(CITIES, 'sinop-mt')).toBeUndefined();
    expect(findCityBySlug(CITIES, 'busca')).toBeUndefined();
    expect(findCityByIbge(CITIES, '5103403')).toBe(CUIABA);
    expect(findCityByNameState(CITIES, 'VARZEA GRANDE', 'mt')).toBe(VG);
    expect(findCityByNameState(CITIES, 'Cuiabá', 'SP')).toBeUndefined();
  });
});

it('expõe o nome do cookie', () => {
  expect(CITY_COOKIE).toBe('kz_city');
});
