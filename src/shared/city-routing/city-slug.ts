/**
 * Cidade na URL. O slug é derivado de nome + UF (`Cuiabá/MT` -> `cuiaba-mt`) — sem coluna no
 * banco — e SEMPRE leva a UF, pra não mudar se uma homônima entrar na lista depois (link fixo).
 * Puro e sem dependências: usado pelo servidor (rotas, loader) e pelo cliente (cards, cookie).
 */

export type RoutableCity = { ibge: string; name: string; state: string; stateName: string };

/** Cookie espelho da cidade salva (valor = slug), lido no servidor pra redirecionar `/`. */
export const CITY_COOKIE = 'kz_city';

/** Primeiros segmentos de rota do app: nunca podem ser slug de cidade. */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  'api',
  'painel',
  'login',
  'registre-se',
  'esqueci-senha',
  'redefinir-senha',
  'busca',
  'descobrir',
  'curtidos',
  'anuncios',
  'anuncio',
  'sitemap.xml',
  'robots.txt',
]);

const SLUG_SHAPE = /^[a-z0-9]+(-[a-z0-9]+)*-[a-z]{2}$/;

const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

const fold = (s: string) => strip(s).trim().toLowerCase();

export function citySlug(name: string, state: string): string {
  const base = strip(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base}-${state.trim().toLowerCase()}`;
}

export function isRoutableSlug(slug: string): boolean {
  return SLUG_SHAPE.test(slug) && !RESERVED_SLUGS.has(slug);
}

export function cityPath(city: { name: string; state: string }, rest = ''): string {
  return `/${citySlug(city.name, city.state)}${rest}`;
}

/** Link do card: canônico quando o resultado traz cidade e UF, senão o legado (que redireciona). */
export function serviceHref(r: { uid: string; city?: string | null; state?: string | null }): string {
  const city = r.city?.trim();
  const state = r.state?.trim();
  return city && state ? cityPath({ name: city, state }, `/anuncio/${r.uid}`) : `/anuncios/${r.uid}`;
}

export function findCityBySlug(cities: RoutableCity[], slug: string): RoutableCity | undefined {
  if (!isRoutableSlug(slug)) return undefined;
  return cities.find((c) => citySlug(c.name, c.state) === slug);
}

export function findCityByIbge(cities: RoutableCity[], ibge: string): RoutableCity | undefined {
  return cities.find((c) => c.ibge === ibge);
}

export function findCityByNameState(
  cities: RoutableCity[],
  name: string,
  state: string
): RoutableCity | undefined {
  const n = fold(name);
  const s = fold(state);
  return cities.find((c) => fold(c.name) === n && fold(c.state) === s);
}
