import type { LatLng } from './directions';
import { distanceKm, formatDistanceKm } from './distance';

export type RouteMode = 'foot' | 'car';
export type RouteLeg = { km: number; minutes: number };
/** Resposta de `/api/location/route`. `approx`: estimativa a partir da linha reta (OSRM falhou). */
export type RouteSummary = { approx: boolean; foot: RouteLeg; car: RouteLeg };

/** Percurso costuma ser ~30% maior que a linha reta. */
export const ROUTE_DETOUR_FACTOR = 1.3;
export const ROUTE_SPEED_KMH: Record<RouteMode, number> = { foot: 5, car: 30 };

/** Arredonda para o que a UI usa: km com 2 casas, minutos inteiros (mínimo 1). */
export function routeLeg(km: number, minutes: number): RouteLeg {
  return { km: Math.round(km * 100) / 100, minutes: Math.max(1, Math.round(minutes)) };
}

/** Estimativa sem serviço de rota: linha reta × 1,3, a 5 km/h a pé e 30 km/h de carro. */
export function estimateRoute(origin: LatLng, destination: LatLng): RouteSummary {
  const km = distanceKm(origin, destination) * ROUTE_DETOUR_FACTOR;
  const leg = (mode: RouteMode) => routeLeg(km, (km / ROUTE_SPEED_KMH[mode]) * 60);
  return { approx: true, foot: leg('foot'), car: leg('car') };
}

/** "26 min", "1 h", "1 h 05". */
export function formatDurationMin(minutes: number): string {
  const total = Math.max(1, Math.round(minutes));
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

/** "2,1 km · 26 min". */
export function formatRouteLeg(leg: RouteLeg): string {
  return `${formatDistanceKm(leg.km)} · ${formatDurationMin(leg.minutes)}`;
}

/** ~110 m de precisão: basta para rota e protege a posição exata (e melhora o cache). */
export function roundCoord(n: number, digits = 3): number {
  return Number(n.toFixed(digits));
}

const NUM = /^-?\d+(\.\d+)?$/;

/** "lat,lng" → LatLng, ou null se malformado ou fora da faixa. */
export function parseLatLngParam(value: string | null | undefined): LatLng | null {
  if (!value) return null;
  const parts = value.split(',').map((p) => p.trim());
  if (parts.length !== 2 || !parts.every((p) => NUM.test(p))) return null;
  const [lat, lng] = parts.map(Number);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

const OSRM_PROFILE: Record<RouteMode, string> = { foot: 'routed-foot/route/v1/foot', car: 'routed-car/route/v1/driving' };

/** URL do OSRM FOSSGIS (routing.openstreetmap.de), que recebe `lng,lat`. */
export function osrmRouteUrl(mode: RouteMode, origin: LatLng, destination: LatLng): string {
  const pt = (p: LatLng) => `${p.lng},${p.lat}`;
  return `https://routing.openstreetmap.de/${OSRM_PROFILE[mode]}/${pt(origin)};${pt(destination)}?overview=false`;
}
