import { describe, it, expect } from 'vitest';
import {
  estimateRoute,
  formatDurationMin,
  formatRouteLeg,
  osrmRouteUrl,
  parseLatLngParam,
  roundCoord,
} from './index';

describe('estimateRoute', () => {
  it('aplica fator 1,3 e 5 km/h a pé, 30 km/h de carro, marcado approx', () => {
    const a = { lat: 0, lng: 0 };
    const b = { lat: 0.01, lng: 0 }; // ~1,112 km em linha reta
    const r = estimateRoute(a, b);
    expect(r.approx).toBe(true);
    expect(r.foot.km).toBeCloseTo(1.112 * 1.3, 2);
    expect(r.foot.minutes).toBeCloseTo((1.112 * 1.3 * 60) / 5, 0);
    expect(r.car.minutes).toBeCloseTo((1.112 * 1.3 * 60) / 30, 0);
  });
});

describe('formatDurationMin', () => {
  it('minutos, mínimo 1, e horas acima de 60', () => {
    expect(formatDurationMin(0.2)).toBe('1 min');
    expect(formatDurationMin(26.4)).toBe('26 min');
    expect(formatDurationMin(60)).toBe('1 h');
    expect(formatDurationMin(65)).toBe('1 h 05');
    expect(formatDurationMin(150)).toBe('2 h 30');
  });
});

describe('formatRouteLeg', () => {
  it('distância · tempo', () => {
    expect(formatRouteLeg({ km: 2.1, minutes: 26 })).toBe('2,1 km · 26 min');
  });
});

describe('roundCoord / parseLatLngParam', () => {
  it('arredonda para 3 casas', () => {
    expect(roundCoord(-15.60149)).toBe(-15.601);
  });
  it('aceita "lat,lng" válido e recusa lixo ou fora da faixa', () => {
    expect(parseLatLngParam('-15.6,-56.1')).toEqual({ lat: -15.6, lng: -56.1 });
    expect(parseLatLngParam(' -15.6 , -56.1 ')).toEqual({ lat: -15.6, lng: -56.1 });
    expect(parseLatLngParam(null)).toBeNull();
    expect(parseLatLngParam('abc')).toBeNull();
    expect(parseLatLngParam('91,0')).toBeNull();
    expect(parseLatLngParam('0,181')).toBeNull();
    expect(parseLatLngParam('1,2,3')).toBeNull();
    expect(parseLatLngParam('1e2,0')).toBeNull();
  });
});

describe('osrmRouteUrl', () => {
  it('lng,lat;lng,lat no perfil certo', () => {
    expect(osrmRouteUrl('car', { lat: -15.6, lng: -56.1 }, { lat: -15.5, lng: -56 })).toBe(
      'https://routing.openstreetmap.de/routed-car/route/v1/driving/-56.1,-15.6;-56,-15.5?overview=false'
    );
    expect(osrmRouteUrl('foot', { lat: 1, lng: 2 }, { lat: 3, lng: 4 })).toBe(
      'https://routing.openstreetmap.de/routed-foot/route/v1/foot/2,1;4,3?overview=false'
    );
    expect(osrmRouteUrl('car', { lat: 1, lng: 2 }, { lat: 3, lng: 4 }, true)).toBe(
      'https://routing.openstreetmap.de/routed-car/route/v1/driving/2,1;4,3?overview=simplified&geometries=geojson'
    );
  });
});
