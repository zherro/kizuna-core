/**
 * Distância e tempo de percurso, a pé e de carro, via OSRM FOSSGIS (sem chave). O starter liga assim:
 * - src/app/api/location/route/route.ts → `export const GET = createRouteHandler()`
 *
 * `GET ?from=lat,lng&to=lat,lng`. A origem é arredondada para 3 casas (~110 m) antes de sair do
 * servidor e serve de chave do cache em memória. Falha ou demora do OSRM → estimativa pela linha
 * reta (`approx: true`), nunca erro para o usuário.
 */
import {
  estimateRoute,
  osrmRouteUrl,
  parseLatLngParam,
  roundCoord,
  routeLeg,
  type LatLng,
  type RouteLeg,
  type RouteMode,
  type RouteSummary,
} from '../../shared/maps';

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export type RouteHandlerOptions = {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  cacheTtlMs?: number;
  cacheMax?: number;
};

type OsrmResponse = {
  code?: string;
  routes?: { distance?: number; duration?: number; geometry?: { coordinates?: unknown } }[];
};

type OsrmLeg = RouteLeg & { path?: LatLng[] };

/** GeoJSON `[lng, lat][]` → `LatLng[]`; formato inesperado → sem traçado. */
function parsePath(coords: unknown): LatLng[] | undefined {
  if (!Array.isArray(coords) || coords.length < 2) return undefined;
  const path: LatLng[] = [];
  for (const c of coords) {
    if (!Array.isArray(c) || typeof c[0] !== 'number' || typeof c[1] !== 'number') return undefined;
    path.push({ lat: c[1], lng: c[0] });
  }
  return path;
}

async function osrmLeg(
  fetchImpl: FetchLike,
  mode: RouteMode,
  from: LatLng,
  to: LatLng,
  timeoutMs: number,
  withGeometry = false
): Promise<OsrmLeg | null> {
  try {
    const res = await fetchImpl(osrmRouteUrl(mode, from, to, withGeometry), {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'User-Agent': 'kizuna-core (route)' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as OsrmResponse;
    const route = data.code === 'Ok' ? data.routes?.[0] : undefined;
    if (typeof route?.distance !== 'number' || typeof route.duration !== 'number') return null;
    const leg: OsrmLeg = routeLeg(route.distance / 1000, route.duration / 60);
    const path = withGeometry ? parsePath(route.geometry?.coordinates) : undefined;
    if (path) leg.path = path;
    return leg;
  } catch {
    return null;
  }
}

export function createRouteHandler({
  fetchImpl = fetch,
  timeoutMs = 3500,
  cacheTtlMs = 30 * 60_000,
  cacheMax = 500,
}: RouteHandlerOptions = {}) {
  const cache = new Map<string, { at: number; body: RouteSummary }>();

  return async function GET(request: Request): Promise<Response> {
    const params = new URL(request.url).searchParams;
    const rawFrom = parseLatLngParam(params.get('from'));
    const rawTo = parseLatLngParam(params.get('to'));
    if (!rawFrom || !rawTo) {
      return Response.json({ message: 'Coordenadas inválidas.' }, { status: 400 });
    }
    const from = { lat: roundCoord(rawFrom.lat), lng: roundCoord(rawFrom.lng) };
    const to = { lat: roundCoord(rawTo.lat, 5), lng: roundCoord(rawTo.lng, 5) };
    const key = `${from.lat},${from.lng};${to.lat},${to.lng}`;

    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < cacheTtlMs) return Response.json(hit.body, { headers: { 'Cache-Control': 'private, max-age=600' } });

    const [foot, car] = await Promise.all([
      osrmLeg(fetchImpl, 'foot', from, to, timeoutMs),
      osrmLeg(fetchImpl, 'car', from, to, timeoutMs, true),
    ]);
    const estimate = estimateRoute(from, to);
    let body: RouteSummary = estimate;
    if (foot && car) {
      const { path, ...carLeg } = car;
      body = { approx: false, foot, car: carLeg, ...(path ? { path } : {}) };
    }

    // Só guarda resposta real: estimativa é barata e o OSRM pode voltar logo.
    if (!body.approx) {
      if (cache.size >= cacheMax) cache.delete(cache.keys().next().value as string);
      cache.set(key, { at: Date.now(), body });
    }
    return Response.json(body, { headers: { 'Cache-Control': 'private, max-age=600' } });
  };
}
