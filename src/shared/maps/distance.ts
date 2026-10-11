import type { LatLng } from './directions';

const EARTH_RADIUS_KM = 6371.0088;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Distância em linha reta (haversine). NÃO é distância de percurso. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "430 m", "6,3 km", "12 km" (vírgula decimal, pt-BR). */
export function formatDistanceKm(km: number): string {
  const m = Math.round(km * 1000);
  if (m < 1000) return `${m} m`;
  const tenths = Math.round(km * 10) / 10;
  if (tenths < 10) return `${tenths.toFixed(1).replace('.', ',')} km`;
  return `${Math.round(km)} km`;
}
