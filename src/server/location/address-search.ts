/**
 * Busca de endereço/lugar por texto para o formulário de endereço (`AddressGoogleForm`).
 * Com `GOOGLE_MAPS_SERVER_KEY`: Google Places (Text Search, New). Sem chave ou com o Google
 * falhando: Photon (OpenStreetMap, gratuito, sem chave), convertido para o MESMO formato
 * (`{ places: [...] }` com `displayName`, `formattedAddress`, `location`, `addressComponents`).
 */

const GOOGLE_URL = 'https://places.googleapis.com/v1/places:searchText';
const PHOTON_URL = 'https://photon.komoot.io/api/';
const TIMEOUT_MS = 6000;
/** Viés de proximidade padrão do Photon (centro do Brasil): só ordena, não filtra. */
const DEFAULT_BIAS = { lat: -15.6, lon: -56.1 };

export type AddressComponent = { longText: string; shortText: string; types: string[] };
export type AddressPlace = {
  id: string;
  displayName: { text: string };
  formattedAddress: string;
  location: { latitude: number; longitude: number };
  addressComponents: AddressComponent[];
};

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, unknown>;
};

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');

export function photonToPlaces(data: { features?: PhotonFeature[] }): AddressPlace[] {
  const out: AddressPlace[] = [];
  for (const f of data.features ?? []) {
    const p = f.properties ?? {};
    const [lon, lat] = f.geometry?.coordinates ?? [];
    if (typeof lat !== 'number' || typeof lon !== 'number') continue;
    if (str(p.countrycode).toUpperCase() !== 'BR') continue;

    const street = str(p.street);
    const number = str(p.housenumber);
    const district = str(p.district) || str(p.locality);
    const city = str(p.city) || str(p.county);
    const state = str(p.state);
    const postcode = str(p.postcode);
    const name = str(p.name);

    const comps: AddressComponent[] = [];
    const add = (text: string, ...types: string[]) => {
      if (text) comps.push({ longText: text, shortText: text, types });
    };
    add(street || (p.type === 'street' ? name : ''), 'route');
    add(number, 'street_number');
    add(district, 'sublocality', 'sublocality_level_1');
    add(city, 'locality');
    add(state, 'administrative_area_level_1');
    add(postcode, 'postal_code');
    add('BR', 'country');

    const line1 = [street, number].filter(Boolean).join(', ');
    const formattedAddress = [
      [line1, district].filter(Boolean).join(' - '),
      [city, state].filter(Boolean).join(' - '),
      postcode,
    ]
      .filter(Boolean)
      .join(', ');

    out.push({
      id: `osm:${str(p.osm_type)}${str(p.osm_id)}`,
      displayName: { text: name || line1 || city },
      formattedAddress: formattedAddress || name,
      location: { latitude: lat, longitude: lon },
      addressComponents: comps,
    });
  }
  return out;
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

async function searchGoogle(query: string, key: string): Promise<{ places?: unknown[] }> {
  return (await fetchJson(GOOGLE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.location,places.addressComponents',
    },
    body: JSON.stringify({ textQuery: query, languageCode: 'pt-BR', regionCode: 'BR' }),
  })) as { places?: unknown[] };
}

async function searchPhoton(query: string, bias = DEFAULT_BIAS): Promise<{ places: AddressPlace[] }> {
  const url = `${PHOTON_URL}?q=${encodeURIComponent(query)}&limit=8&lat=${bias.lat}&lon=${bias.lon}`;
  return { places: photonToPlaces((await fetchJson(url)) as { features?: PhotonFeature[] }) };
}

export async function searchAddress(
  query: string,
  { googleKey, bias }: { googleKey?: string | null; bias?: { lat: number; lon: number } } = {}
): Promise<{ places?: unknown[] }> {
  if (googleKey) {
    try {
      return await searchGoogle(query, googleKey);
    } catch (e) {
      console.error('Google Places falhou; usando OpenStreetMap:', (e as Error).message);
    }
  }
  return searchPhoton(query, bias);
}
