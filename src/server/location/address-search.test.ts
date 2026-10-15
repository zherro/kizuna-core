import { afterEach, describe, expect, it, vi } from 'vitest';
import { photonToPlaces, searchAddress } from './address-search';

const photon = {
  features: [
    {
      geometry: { coordinates: [-56.09, -15.6] },
      properties: {
        osm_type: 'N',
        osm_id: 42,
        name: 'Casa de Festas X',
        street: 'Rua das Flores',
        housenumber: '10',
        postcode: '78000-000',
        district: 'Centro',
        city: 'Cuiabá',
        state: 'Mato Grosso',
        countrycode: 'BR',
      },
    },
    { geometry: { coordinates: [0, 0] }, properties: { name: 'Fora', countrycode: 'FR' } },
  ],
};

afterEach(() => vi.unstubAllGlobals());

describe('photonToPlaces', () => {
  it('converte para o formato do Google Places (só Brasil)', () => {
    const places = photonToPlaces(photon);
    expect(places).toHaveLength(1);
    const p = places[0];
    expect(p.id).toBe('osm:N42');
    expect(p.displayName).toEqual({ text: 'Casa de Festas X' });
    expect(p.location).toEqual({ latitude: -15.6, longitude: -56.09 });
    expect(p.formattedAddress).toBe('Rua das Flores, 10 - Centro, Cuiabá - Mato Grosso, 78000-000');
    const get = (t: string) => p.addressComponents.find((c) => c.types.includes(t))?.longText;
    expect(get('route')).toBe('Rua das Flores');
    expect(get('street_number')).toBe('10');
    expect(get('sublocality')).toBe('Centro');
    expect(get('locality')).toBe('Cuiabá');
    expect(get('administrative_area_level_1')).toBe('Mato Grosso');
    expect(get('postal_code')).toBe('78000-000');
  });
});

describe('searchAddress', () => {
  it('sem chave do Google usa o Photon', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(photon)));
    vi.stubGlobal('fetch', fetchMock);
    const out = await searchAddress('casa de festas', { googleKey: undefined });
    expect(String(fetchMock.mock.calls[0][0])).toContain('photon.komoot.io');
    expect(out.places[0].displayName.text).toBe('Casa de Festas X');
  });

  it('Google falhando cai no Photon', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('denied', { status: 403 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(photon)));
    vi.stubGlobal('fetch', fetchMock);
    const out = await searchAddress('x', { googleKey: 'k' });
    expect(out.places).toHaveLength(1);
  });

  it('Google ok devolve a resposta do Google', async () => {
    const google = { places: [{ id: 'g1' }] };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(google))));
    expect(await searchAddress('x', { googleKey: 'k' })).toEqual(google);
  });
});
