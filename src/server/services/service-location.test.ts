import { describe, expect, it, vi } from 'vitest';

vi.mock('../postgrest-crud', () => ({ serverFetchResource: vi.fn() }));
vi.mock('../postrest/conn', () => ({ pgrstRpc: vi.fn() }));
vi.mock('../regions', () => ({ projectRegions: [], withProjectRegionCities: <T,>(b: T) => b }));

import { buildServiceLocation } from './service-detail-data';

const full = {
  street: 'Rua X',
  number: '100',
  complement: 'Sala 2',
  neighborhood: 'Centro',
  city: 'Cuiabá',
  state: 'MT',
  latitude: -15.6,
  longitude: -56.1,
  active: true,
};

describe('buildServiceLocation', () => {
  it('sem endereço → null', () => {
    expect(buildServiceLocation([])).toBeNull();
  });

  it('monta o endereço completo e as coordenadas', () => {
    expect(buildServiceLocation([{ ...full, label: 'Arena' }])).toEqual({
      address: 'Rua X, 100, Sala 2, Centro, Cuiabá - MT',
      lat: -15.6,
      lng: -56.1,
      label: 'Arena',
    });
  });

  it('omite partes vazias', () => {
    const loc = buildServiceLocation([
      { street: 'Rua X', number: ' ', complement: null, neighborhood: '', city: 'Cuiabá', state: '', active: true },
    ]);
    expect(loc?.address).toBe('Rua X, Cuiabá');
  });

  it('sem coordenadas → lat/lng null, mantém o endereço', () => {
    const loc = buildServiceLocation([{ ...full, latitude: null, longitude: null }]);
    expect(loc).toMatchObject({ lat: null, lng: null, address: 'Rua X, 100, Sala 2, Centro, Cuiabá - MT' });
  });

  it('prefere o primário ativo; ignora inativos', () => {
    const loc = buildServiceLocation([
      { ...full, street: 'Rua A', active: true },
      { ...full, street: 'Rua B', isPrimary: true, active: true },
      { ...full, street: 'Rua C', is_primary: true, active: false },
    ]);
    expect(loc?.address.startsWith('Rua B')).toBe(true);
    const fallback = buildServiceLocation([
      { ...full, street: 'Rua C', isPrimary: true, active: false },
      { ...full, street: 'Rua A', active: true },
    ]);
    expect(fallback?.address.startsWith('Rua A')).toBe(true);
  });

  it('descarta coordenadas fora da faixa, NaN ou só uma das duas', () => {
    expect(buildServiceLocation([{ ...full, latitude: 200 }])).toMatchObject({ lat: null, lng: null });
    expect(buildServiceLocation([{ ...full, longitude: Number.NaN }])).toMatchObject({ lat: null, lng: null });
    expect(buildServiceLocation([{ ...full, longitude: null }])).toMatchObject({ lat: null, lng: null });
  });

  it('aceita coordenadas em string numérica (PostgREST numeric)', () => {
    expect(buildServiceLocation([{ ...full, latitude: '-15.6', longitude: '-56.1' }])).toMatchObject({
      lat: -15.6,
      lng: -56.1,
    });
  });

  it('endereço vazio e sem coordenadas → null', () => {
    expect(buildServiceLocation([{ active: true, latitude: null, longitude: null }])).toBeNull();
  });
});
