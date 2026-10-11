export type LatLng = { lat: number; lng: number };

export type DirectionsInput = {
  destination?: LatLng | null;
  address?: string | null;
  /** Posição do usuário. Só o Google Maps aceita origem por link; o Waze usa o GPS do aparelho. */
  origin?: LatLng | null;
};

export type DirectionsLinks = { google: string | null; waze: string | null };

const pair = (p: LatLng) => `${p.lat},${p.lng}`;

/** Links oficiais de rota (sem chave de API). Coordenadas têm preferência; sem elas usa o endereço. */
export function directionsLinks({ destination, address, origin }: DirectionsInput): DirectionsLinks {
  const text = address?.trim() ?? '';
  const target = destination ? pair(destination) : text;
  if (!target) return { google: null, waze: null };

  const encoded = encodeURIComponent(target);
  const google =
    `https://www.google.com/maps/dir/?api=1&destination=${encoded}` +
    (origin ? `&origin=${encodeURIComponent(pair(origin))}` : '');
  const waze = destination
    ? `https://waze.com/ul?ll=${encoded}&navigate=yes`
    : `https://waze.com/ul?q=${encoded}&navigate=yes`;

  return { google, waze };
}
