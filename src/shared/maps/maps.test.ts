import { describe, it, expect } from 'vitest';
import { directionsLinks, distanceKm, formatDistanceKm, osmEmbedUrl, osmViewUrl } from './index';

describe('directionsLinks', () => {
  it('com coordenadas usa lat,lng no Google e no Waze', () => {
    const links = directionsLinks({ destination: { lat: -15.601, lng: -56.097 } });
    expect(links.google).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=-15.601%2C-56.097'
    );
    expect(links.waze).toBe('https://waze.com/ul?ll=-15.601%2C-56.097&navigate=yes');
  });

  it('só com endereço codifica acento e espaço', () => {
    const links = directionsLinks({ address: 'Av. Getúlio Vargas, 100' });
    expect(links.google).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=Av.%20Get%C3%BAlio%20Vargas%2C%20100'
    );
    expect(links.waze).toBe('https://waze.com/ul?q=Av.%20Get%C3%BAlio%20Vargas%2C%20100&navigate=yes');
  });

  it('coordenadas têm preferência sobre o endereço', () => {
    const links = directionsLinks({ destination: { lat: 1, lng: 2 }, address: 'Rua X' });
    expect(links.google).toContain('destination=1%2C2');
  });

  it('origem entra só no Google', () => {
    const links = directionsLinks({
      destination: { lat: -15.6, lng: -56.1 },
      origin: { lat: -15.5, lng: -56.0 },
    });
    expect(links.google).toContain('&origin=-15.5%2C-56');
    expect(links.waze).not.toContain('origin');
  });

  it('sem destino nem endereço devolve null nos dois', () => {
    expect(directionsLinks({})).toEqual({ google: null, waze: null });
    expect(directionsLinks({ address: '   ' })).toEqual({ google: null, waze: null });
  });
});

describe('distanceKm', () => {
  it('zero entre o mesmo ponto', () => {
    expect(distanceKm({ lat: -15.6, lng: -56.1 }, { lat: -15.6, lng: -56.1 })).toBe(0);
  });

  it('1 grau de latitude vale cerca de 111,2 km', () => {
    expect(distanceKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111.2, 0);
  });

  it('Cuiabá centro a Várzea Grande centro fica entre 6 e 7 km', () => {
    const km = distanceKm({ lat: -15.601, lng: -56.097 }, { lat: -15.646, lng: -56.132 });
    expect(km).toBeGreaterThan(6);
    expect(km).toBeLessThan(7);
  });
});

describe('formatDistanceKm', () => {
  it('metros abaixo de 1 km, uma casa até 10 km, inteiro acima', () => {
    expect(formatDistanceKm(0.43)).toBe('430 m');
    expect(formatDistanceKm(6.25)).toBe('6,3 km');
    expect(formatDistanceKm(12.4)).toBe('12 km');
  });

  it('arredonda antes de escolher o formato (sem "1000 m" nem "10,0 km")', () => {
    expect(formatDistanceKm(0)).toBe('0 m');
    expect(formatDistanceKm(0.9994)).toBe('999 m');
    expect(formatDistanceKm(0.9996)).toBe('1,0 km');
    expect(formatDistanceKm(1)).toBe('1,0 km');
    expect(formatDistanceKm(9.96)).toBe('10 km');
    expect(formatDistanceKm(10)).toBe('10 km');
  });
});

describe('osmEmbedUrl / osmViewUrl', () => {
  it('monta bbox ao redor do ponto e marcador', () => {
    const url = osmEmbedUrl({ lat: -15.6, lng: -56.1 });
    expect(url.startsWith('https://www.openstreetmap.org/export/embed.html?')).toBe(true);
    expect(url).toContain('bbox=-56.103%2C-15.603%2C-56.097%2C-15.597');
    expect(url).toContain('layer=mapnik');
    expect(url).toContain('marker=-15.6%2C-56.1');
  });

  it('link do mapa maior', () => {
    expect(osmViewUrl({ lat: -15.6, lng: -56.1 })).toBe(
      'https://www.openstreetmap.org/?mlat=-15.6&mlon=-56.1#map=17/-15.6/-56.1'
    );
  });
});
