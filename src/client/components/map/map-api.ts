import type { LatLng } from '../../../shared/maps';
import { unproject, type MapSize, type MapView } from './map-viewport';

/**
 * Dados do mapa: pinos por raio e detalhe sob demanda, pela rota genérica de RPC
 * (`POST /api/resources/<fn>`, ver `rpcSearch` e `plugins/search/0012_map_pins.sql`).
 */

export const MAP_PINS_RPC = 'fn_map_pins';
export const MAP_PLACE_RPC = 'fn_map_place';
export const MAP_ENDPOINT = '/api/resources';

/** Linha de `fn_map_pins`: só o essencial para desenhar um pino. */
export type MapPinRow = {
  uid: string;
  address_id: number | string;
  title: string;
  category_slug: string | null;
  category_group_slug: string | null;
  cover_file_id: string | null;
  latitude: number;
  longitude: number;
  venue: string | null;
  city: string | null;
  state: string | null;
  distance_km?: number | null;
  event_start: string | null;
};

export type MapPlaceFacts = {
  telefone?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  site?: string | null;
  horario?: { texto?: string | null }[] | null;
  preco?: string | null;
  gratuito?: boolean | null;
  dicas?: string | null;
};

/** Linha de `fn_map_place`: o detalhe de um anúncio. */
export type MapPlaceDetail = {
  uid: string;
  title: string;
  description: string | null;
  category: string | null;
  category_slug: string | null;
  category_group_slug: string | null;
  cover_file_id: string | null;
  image_file_ids: string[] | null;
  price: number | string | null;
  price_type: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  venue: string | null;
  city: string | null;
  state: string | null;
  event_start: string | null;
  facts: MapPlaceFacts | null;
};

export const pinKey = (r: Pick<MapPinRow, 'uid' | 'address_id'>) => `${r.uid}:${r.address_id}`;

export const MIN_RADIUS_KM = 1;
export const MAX_RADIUS_KM = 50;
export const CACHE_CAP = 400;

async function rpc<T>(fn: string, body: unknown, signal?: AbortSignal, endpoint = MAP_ENDPOINT): Promise<T[]> {
  const res = await fetch(`${endpoint}/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(`${fn} ${res.status}`);
  const data = (await res.json()) as T[] | { items?: T[] };
  return Array.isArray(data) ? data : (data.items ?? []);
}

export type MapPinsQuery = { lat: number; lng: number; radiusKm: number; limit?: number };

export function fetchMapPins(q: MapPinsQuery, signal?: AbortSignal, endpoint?: string): Promise<MapPinRow[]> {
  return rpc<MapPinRow>(
    MAP_PINS_RPC,
    { p_lat: q.lat, p_lng: q.lng, p_radius_km: q.radiusKm, p_limit: q.limit ?? 200, p_group_slugs: null, p_category_slugs: null },
    signal,
    endpoint
  );
}

/** Detalhe de um anúncio; `null` quando não é mais público (resposta vazia). */
export async function fetchMapPlace(uid: string, signal?: AbortSignal, endpoint?: string): Promise<MapPlaceDetail | null> {
  const rows = await rpc<MapPlaceDetail>(MAP_PLACE_RPC, { p_uid: uid }, signal, endpoint);
  return rows[0] ?? null;
}

const EARTH_KM = 6371.0088;

export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Raio da busca: metade da diagonal da janela visível, em km, entre 1 e 50. */
export function viewRadiusKm(size: MapSize, view: MapView): number {
  const lat = unproject(view.center).lat;
  const metersPerPx = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** view.zoom;
  const km = (Math.hypot(size.w, size.h) / 2 / 1000) * metersPerPx;
  return Math.max(MIN_RADIUS_KM, Math.min(MAX_RADIUS_KM, km));
}

export type SearchArea = { lat: number; lng: number; radiusKm: number };

/** Refaz a busca se o centro andou mais de 30% do raio ou o raio passou do já buscado. */
export function needsRefetch(last: SearchArea | null, next: SearchArea): boolean {
  if (!last) return true;
  if (next.radiusKm > last.radiusKm) return true;
  return distanceKm(last, next) > 0.3 * next.radiusKm;
}

/** Junta os pinos novos ao cache (por `uid:address_id`) e, acima do teto, descarta os mais distantes do centro. */
export function mergePins(
  cache: Map<string, MapPinRow>,
  incoming: MapPinRow[],
  center: LatLng,
  cap = CACHE_CAP
): Map<string, MapPinRow> {
  const next = new Map(cache);
  for (const row of incoming) next.set(pinKey(row), row);
  if (next.size <= cap) return next;
  const keep = [...next.entries()]
    .map(([key, row]) => ({ key, row, d: distanceKm(center, { lat: row.latitude, lng: row.longitude }) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, cap);
  return new Map(keep.map(({ key, row }) => [key, row]));
}
