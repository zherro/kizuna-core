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

type OsrmResponse = { code?: string; routes?: { distance?: number; duration?: number }[] };

async function osrmLeg(fetchImpl: FetchLike, mode: RouteMode, from: LatLng, to: LatLng, timeoutMs: number): Promise<RouteLeg | null> {
  try {
    const res = await fetchImpl(osrmRouteUrl(mode, from, to), {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'User-Agent': 'kizuna-core (route)' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as OsrmResponse;
    const route = data.code === 'Ok' ? data.routes?.[0] : undefined;
    if (typeof route?.distance !== 'number' || typeof route.duration !== 'number') return null;
    return routeLeg(route.distance / 1000, route.duration / 60);
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
      osrmLeg(fetchImpl, 'car', from, to, timeoutMs),
    ]);
    const estimate = estimateRoute(from, to);
    const body: RouteSummary =
      foot && car ? { approx: false, foot, car } : estimate;

    // Só guarda resposta real: estimativa é barata e o OSRM pode voltar logo.
    if (!body.approx) {
      if (cache.size >= cacheMax) cache.delete(cache.keys().next().value as string);
      cache.set(key, { at: Date.now(), body });
    }
    return Response.json(body, { headers: { 'Cache-Control': 'private, max-age=600' } });
  };
}
