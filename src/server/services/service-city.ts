import {
  findCityByIbge,
  findCityByNameState,
  type RoutableCity,
} from '../../shared/city-routing/city-slug';

/** Linha de `service_addresses` — aceita camelCase (mapOutput) e snake_case (PostgREST cru). */
export type ServiceAddressLike = {
  cityIbge?: string | null;
  city_ibge?: string | null;
  isPrimary?: boolean | null;
  is_primary?: boolean | null;
};

const ibgeOf = (a: ServiceAddressLike) => String(a.cityIbge ?? a.city_ibge ?? '').trim();
const primaryOf = (a: ServiceAddressLike) => Boolean(a.isPrimary ?? a.is_primary);

/**
 * Cidade canônica do anúncio (a da URL fixa): endereço principal na lista de cidades atendidas;
 * senão o primeiro endereço que esteja na lista; senão a cidade do perfil do prestador; senão
 * `null` (o anúncio fica só em `/anuncios/[uid]`).
 */
export function pickServiceCity(
  addresses: ServiceAddressLike[],
  provider: { city?: string | null; state?: string | null } | null,
  cities: RoutableCity[]
): RoutableCity | null {
  const ordered = [...addresses].sort((a, b) => Number(primaryOf(b)) - Number(primaryOf(a)));
  for (const address of ordered) {
    const ibge = ibgeOf(address);
    if (!ibge) continue;
    const city = findCityByIbge(cities, ibge);
    if (city) return city;
  }
  if (provider?.city && provider.state) {
    return findCityByNameState(cities, provider.city, provider.state) ?? null;
  }
  return null;
}
