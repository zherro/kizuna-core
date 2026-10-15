import { serverFetchResource } from '../postgrest-crud';
import { pgrstRpc } from '../postrest/conn';
import { runServiceSearch, runServiceSearchStrict, seedFromKey } from './service-search';
import { listLocationCities } from '../location';
import type { RoutableCity } from '../../shared/city-routing/city-slug';
import { pickServiceCity, type ServiceAddressLike } from './service-city';
import { fetchServiceSiblings, type ServiceSibling } from './service-siblings';
import { projectRegions } from '../regions';
import { buildLinkedSearchParams, buildTagSearchParams, futureEventsFirst } from './tag-rail-data';
import {
  CODIGO_PATTERN,
  codigoCandidates,
  codigoOf,
  linkedRailTitle,
  normalizeServiceTag,
  orderTagsForRails,
  serviceTagRailTitle,
  serviceTagsOf,
} from '../../shared/service-tags';
import { cityPath, serviceHref } from '../../shared/city-routing/city-slug';
import type { FormSchema, FormValues } from '../../client/components/form-builder';
import type { ServiceRecord } from '../../client/components/services/service-type';
import type { ServiceResult } from '../../client/components/search/search-types';
import { photosFor } from '../../client/components/services/service-helpers';
import { slugify } from '../../client/components/pages/slugify';
import { humanizeSlug } from '../../client/components/services/detail/ad-extra-fields-format';
import { serviceRefExtras } from '../../shared/service-ref-extras';

/**
 * Carrega tudo que a tela de detalhe de um anúncio (`/anuncios/[uid]`, projeto consumidor)
 * precisa — genérico por design: não sabe se a categoria é "service" ou "cinema", só busca os
 * dados brutos (serviço, endereço embutido em `extras`/`service_addresses` fica de fora — quem
 * quiser endereço lê `service.extras`/`ServiceRecord` direto). A escolha de layout por categoria
 * é do componente de UI (`resolveServiceDetailVariant`), não deste loader.
 *
 * Sem `unstable_cache` aqui de propósito — cache/revalidate é decisão da rota (`export const
 * revalidate = ...` no `page.tsx` do projeto consumidor), não do loader do core.
 */

type ServiceSubcategoryLink = { categorySubId: string };
type SubcategoryOption = { id: string | number; name: string };

/** Colunas públicas de `fn_get_service_provider` — nunca telefone/email/documento. */
export type ProviderProfile = {
  user_id: string;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
};

export type ServiceExtraFields = { schema: FormSchema; answers: FormValues } | null;

export type RelatedResult = { items: ServiceResult[]; scope: 'category' | 'group' };

/** Carrossel "por tag" da tela de detalhe: outros anúncios com a tag `tag` (`extras.tags`). */
export type ServiceTagRailResult = { tag: string; title: string; items: ServiceResult[] };

/** No máximo quantos carrosséis por tag a tela de detalhe mostra. */
export const MAX_DETAIL_TAG_RAILS = 2;

/** Local do endereço primário do anúncio (JSON-serializável). `address` é texto pronto pra exibir. */
export type ServiceLocation = {
  address: string;
  lat: number | null;
  lng: number | null;
  label: string | null;
};

/** Serviço cujo `extras.codigo` o anúncio cita em `extras.tags` — quem organiza (ex.: a casa do evento). JSON-serializável. */
export type ServiceOrganizer = { uid: string; title: string; href: string };

/** Local do evento: anúncio (variant `lugar`) via `extras.local_ref` ou tag `local:<codigo>`. JSON-serializável. */
export type ServiceVenue = {
  uid: string;
  title: string;
  href: string;
  photo: string | null;
  address: string | null;
  cityName: string | null;
};

export type ServiceDetailData = {
  service: ServiceRecord;
  subcategoryNames: string[];
  provider: ProviderProfile | null;
  extraFields: ServiceExtraFields;
  related: RelatedResult;
  /** Carrosséis por tag, acima dos relacionados: primeiro o de vinculados (anúncios que citam o
   * `extras.codigo` deste serviço; título `extras.vinculosTitulo` ou "Vinculados"), depois os das
   * tags compartilhadas (`extras.tags`; `local:*` primeiro, no máximo `MAX_DETAIL_TAG_RAILS`), sem
   * repetir anúncio entre eles. Opcional: dado em cache gerado
   * antes deste campo não o tem (trate ausente como `[]`). */
  tagRails?: ServiceTagRailResult[];
  randomServices: ServiceResult[];
  /** Cidade canônica do anúncio (URL fixa `/[cidade]/anuncio/[uid]`); `null` = sem cidade resolvível. */
  city: RoutableCity | null;
  /** O mesmo anúncio nas cidades irmãs de `city` (`regions`) — ex.: o filme em cartaz em VG. */
  siblings: ServiceSibling[];
  /** Endereço primário e ativo (texto + coordenadas); `null` = sem endereço utilizável. */
  location: ServiceLocation | null;
  /** Serviço ativo cujo `extras.codigo` é uma das `extras.tags` do anúncio (quem organiza). Opcional: cache gerado antes deste campo não o tem (trate ausente como `null`). */
  organizer?: ServiceOrganizer | null;
  /** Local do evento (ver `fetchVenue`); `organizer` é derivado dele. Ausente em cache antigo → `null`. */
  venue?: ServiceVenue | null;
  /** Pontos de venda resolvidos (ver `fetchLinkedRefs`). Ausente em cache antigo → `[]`. */
  salePoints?: ServiceSalePoint[];
  /** Artistas (`extras.artistas`) resolvidos (ver `fetchLinkedRefs`). Ausente em cache antigo → `[]`. */
  artists?: ServiceLinkedItem[];
};

type CategoryTaxonomyRow = { id: number | string; slug?: string; categoryGroupId?: number | string | null };
type GroupTaxonomyRow = { id: number | string; name: string; slug: string; active?: boolean; icon?: string };

/**
 * `services.category_group_id` pode estar nulo (anúncio importado só com a categoria): sem o grupo
 * a variant por grupo (`variantByGroupSlug`) nunca casa. Deriva então o grupo pela categoria
 * (`categories.category_group_id` -> `categories_group`), na memória — mesmo fallback da RPC de
 * busca (`category_group_slug`). Também completa o slug da categoria se o embed veio sem ele.
 * Falha de rede/recurso nunca derruba a página: segue com o que já havia.
 */
export async function ensureServiceTaxonomy(service: ServiceRecord): Promise<ServiceRecord> {
  const hasGroupSlug = Boolean(service.categoryGroup?.slug);
  const hasCategorySlug = Boolean(service.category?.slug);
  if (hasGroupSlug && hasCategorySlug) return service;
  const categoryId = Number(service.categoryId);
  if (!Number.isFinite(categoryId)) return service;

  const categories = await serverFetchResource<CategoryTaxonomyRow>(
    'categories_public',
    { id: String(categoryId) },
    { auth: null, limit: 1 }
  ).catch(() => []);
  const category = categories[0];
  if (!category) return service;

  if (!hasCategorySlug && category.slug) {
    service.category = {
      ...(service.category ?? { id: String(category.id), name: '' }),
      slug: category.slug,
    };
  }
  if (hasGroupSlug) return service;

  const rawGroupId = category.categoryGroupId ?? service.categoryGroupId;
  const groupId = rawGroupId == null || rawGroupId === '' ? NaN : Number(rawGroupId);
  if (!Number.isFinite(groupId)) return service;
  const groups = await serverFetchResource<GroupTaxonomyRow>(
    'categories_group',
    { id: String(groupId) },
    { auth: null, limit: 1 }
  ).catch(() => []);
  const group = groups[0];
  if (!group?.slug) return service;

  service.categoryGroup = {
    id: String(group.id),
    name: group.name,
    slug: group.slug,
    active: group.active,
    icon: group.icon,
  };
  service.categoryGroupId = String(group.id);
  return service;
}

async function fetchService(uid: string): Promise<ServiceRecord | null> {
  const services = await serverFetchResource<ServiceRecord>(
    'services',
    { uid, active: 'true', status: 'active' },
    { auth: null, limit: 1 }
  ).catch(() => []);
  return services[0] ?? null;
}

/** Tags de subcategoria que este anúncio de fato lista — nunca um conjunto fixo inventado. */
async function fetchSubcategoryNames(service: ServiceRecord): Promise<string[]> {
  const links = await serverFetchResource<ServiceSubcategoryLink>(
    'service_categories_sub',
    { service_id: service.id, active: 'true' },
    { auth: null, limit: 50 }
  ).catch(() => []);
  if (links.length === 0) return [];

  const options = await serverFetchResource<SubcategoryOption>(
    'subcategories_public',
    { category_id: service.categoryId },
    { auth: null, limit: 100 }
  ).catch(() => []);
  const nameById = new Map(options.map((option) => [String(option.id), option.name]));

  return links
    .map((link) => nameById.get(link.categorySubId))
    .filter((name): name is string => Boolean(name));
}

async function fetchProviderProfile(serviceUid: string): Promise<ProviderProfile | null> {
  const response = await pgrstRpc(
    'fn_get_service_provider',
    { p_service_uid: serviceUid },
    { auth: null, schema: 'public' }
  ).catch(() => null);
  if (!response?.ok) return null;
  const rows = (await response.json().catch(() => null)) as ProviderProfile[] | null;
  return rows?.[0] ?? null;
}

/** Respostas dinâmicas por categoria — pra `service` são "detalhes do serviço"; pra `cinema` é
 * daqui que a variant de detalhe lê `sessoes[]` e o resto do formulário do filme. */
async function fetchExtraFields(serviceUid: string): Promise<ServiceExtraFields> {
  const response = await pgrstRpc(
    'fn_get_public_service_form_answers',
    { p_service_uid: serviceUid },
    { auth: null, schema: 'public' }
  ).catch(() => null);
  if (!response?.ok) return null;
  const rows = (await response.json().catch(() => null)) as
    | { answers: FormValues; schema_snapshot: FormSchema }[]
    | null;
  const row = rows?.[0];
  return row ? { schema: row.schema_snapshot, answers: row.answers } : null;
}

/** Outros anúncios ativos pra mostrar abaixo — mesma categoria primeiro, alargando pro grupo só
 * quando a categoria sozinha estiver rala. Reusa a mesma RPC pública da busca (`/busca`), então os
 * cards mostram preço/prestador/imagem reais. */
async function fetchRelatedServices(
  service: ServiceRecord,
  excludeUids: ReadonlySet<string> = new Set()
): Promise<RelatedResult> {
  const seed = seedFromKey(service.uid);
  const exclude = (rows: ServiceResult[]) =>
    rows.filter((row) => row.uid !== service.uid && !excludeUids.has(row.uid)).slice(0, 8);

  const categoryId = Number(service.categoryId);
  const byCategory = Number.isFinite(categoryId)
    ? exclude(await runServiceSearch({ p_category_id: categoryId }, seed))
    : [];
  if (byCategory.length >= 4) return { items: byCategory, scope: 'category' };

  const groupSlug = service.categoryGroup?.slug;
  if (groupSlug) {
    const byGroup = exclude(await runServiceSearch({ p_group_category_slug: groupSlug }, seed));
    if (byGroup.length > byCategory.length) return { items: byGroup, scope: 'group' };
  }

  return { items: byCategory, scope: 'category' };
}

/** Carrosséis por tag: um por tag do anúncio (`local:*` primeiro), no máximo
 * `MAX_DETAIL_TAG_RAILS` com itens. Cada um exclui o próprio anúncio e o que um carrossel de tag
 * anterior já mostrou; tag sem outros anúncios não vira carrossel (passa para a próxima). Seed
 * estável por anúncio+tag, como os relacionados. */
export async function fetchTagRails(service: ServiceRecord): Promise<ServiceTagRailResult[]> {
  const code = codigoOf(service);
  const rails: ServiceTagRailResult[] = [];
  const shown = new Set<string>([service.uid]);

  // Vinculados: anúncios que citam o `codigo` deste serviço em `tags` OU apontam para ele em
  // `extras.local_ref` (uid ou código) — uma chamada só. Vêm ANTES dos carrosséis por tag
  // compartilhada e não contam no limite deles; o que mostram não repete nos de baixo.
  {
    const seed = seedFromKey(`${service.uid}:vinculados`);
    const pageSize = 8 + shown.size;
    const tagOnly = code ? buildTagSearchParams([code], { pageSize }) : null;
    const rows = await runServiceSearchStrict(buildLinkedSearchParams(service.uid, code, { pageSize }), seed)
      // banco sem a search 0009 (não conhece `p_local_refs`): só por tag, como antes
      .catch(() => (tagOnly ? runServiceSearch(tagOnly, seed) : []))
      .catch(() => []);
    const items = futureEventsFirst(rows.filter((row) => !shown.has(row.uid))).slice(0, 8);
    if (items.length > 0) {
      items.forEach((item) => shown.add(item.uid));
      rails.push({ tag: code ?? service.uid, title: linkedRailTitle(service), items });
    }
  }

  // o próprio código nas tags (anúncio que cita a si mesmo) já é o carrossel de vinculados
  const tags = orderTagsForRails(serviceTagsOf(service)).filter((t) => t !== code);
  let shared = 0;
  for (const tag of tags) {
    if (shared >= MAX_DETAIL_TAG_RAILS) break;
    const params = buildTagSearchParams([tag], { pageSize: 8 + shown.size });
    if (!params) continue;
    const rows = await runServiceSearch(params, seedFromKey(`${service.uid}:tag:${tag}`));
    const items = rows.filter((row) => !shown.has(row.uid)).slice(0, 8);
    if (items.length === 0) continue;
    items.forEach((item) => shown.add(item.uid));
    rails.push({ tag, title: serviceTagRailTitle(tag), items });
    shared += 1;
  }
  return rails;
}

/** Segunda trilha, sem relação com a categoria — exclui o próprio anúncio e o que a 1ª trilha já
 * mostrou, pra nenhum card repetir na página. Seed própria (string distinta), então o embaralhado
 * é estável dentro da janela de cache mas diferente da 1ª trilha. */
async function fetchRandomServices(
  service: ServiceRecord,
  excludeUids: ReadonlySet<string>
): Promise<ServiceResult[]> {
  const seed = seedFromKey(`${service.uid}:aleatorio`);
  const rows = await runServiceSearch({}, seed);
  return rows.filter((row) => row.uid !== service.uid && !excludeUids.has(row.uid)).slice(0, 8);
}

/** Linha de `service_addresses` com as colunas de endereço (camelCase via mapOutput ou snake_case cru). */
type ServiceAddressRow = ServiceAddressLike & {
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  label?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  active?: boolean | string | null;
};

const clean = (value: unknown): string => String(value ?? '').trim();

/** Número finito dentro da faixa, aceitando string numérica; senão `null`. */
function coordOf(value: unknown, limit: number): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : null;
}

/**
 * Local do anúncio a partir de `service_addresses`: o endereço primário e ativo (senão o primeiro
 * ativo). `address` junta rua, número, complemento, bairro e cidade - UF, omitindo partes vazias.
 * Sem texto de endereço utilizável (nem coordenadas) → `null`. Coordenadas só se ambas válidas.
 */
export function buildServiceLocation(addresses: ServiceAddressRow[]): ServiceLocation | null {
  const active = addresses.filter((a) => a.active == null || a.active === true || a.active === 'true');
  const isPrimary = (a: ServiceAddressRow) => Boolean(a.isPrimary ?? a.is_primary);
  const chosen = active.find(isPrimary) ?? active[0];
  if (!chosen) return null;

  const cityState = [clean(chosen.city), clean(chosen.state)].filter(Boolean).join(' - ');
  const address = [
    clean(chosen.street),
    clean(chosen.number),
    clean(chosen.complement),
    clean(chosen.neighborhood),
    cityState,
  ]
    .filter(Boolean)
    .join(', ');

  const lat = coordOf(chosen.latitude, 90);
  const lng = coordOf(chosen.longitude, 180);
  const hasCoords = lat != null && lng != null;
  if (!address && !hasCoords) return null;

  return {
    address,
    lat: hasCoords ? lat : null,
    lng: hasCoords ? lng : null,
    label: clean(chosen.label) || null,
  };
}

/** Endereços + lista de cidades atendidas → cidade canônica (ver `pickServiceCity`) e local. */
async function fetchServiceCityAndLocation(
  service: ServiceRecord,
  provider: ProviderProfile | null
): Promise<{ city: RoutableCity | null; location: ServiceLocation | null }> {
  const [addresses, cities] = await Promise.all([
    serverFetchResource<ServiceAddressRow>(
      'service_addresses',
      { service_id: service.id, active: 'true' },
      { auth: null, limit: 50, orderBy: 'is_primary', orderDirection: 'desc' }
    ).catch(() => []),
    listLocationCities(null)
      .then((items) =>
        items.map((c) => ({
          ibge: c.value,
          name: c.label,
          state: c.stateCode,
          stateName: c.stateName,
        }))
      )
      .catch(() => []),
  ]);
  return {
    city: pickServiceCity(addresses, provider, cities),
    location: buildServiceLocation(addresses),
  };
}

/** No máximo quantas tags do anúncio são procuradas como `codigo` (numa única consulta). */
const MAX_ORGANIZER_TAGS = 3;

/**
 * "Quem organiza": o serviço ATIVO (`active` + `status='active'`) cujo `extras.codigo` é igual a uma
 * tag do anúncio, exceto o próprio. Convenção: um serviço tem um código (`extras.codigo`) e os
 * outros o citam em `extras.tags`. Nenhum prefixo é fixo.
 *
 * Uma consulta só, PostgREST: `extras->>codigo=in.(t1,t2,t3)&active=eq.true&status=eq.active&
 * uid=neq.<uid>&order=created_at.asc` (via `where`; usa o índice parcial `services_extras_codigo`).
 * Vence a primeira tag da lista do anúncio que tiver dono; código repetido entre ativos → o mais
 * antigo (`created_at`). Link canônico: cidade do anúncio se o endereço do organizador for da mesma
 * cidade; senão cidade/UF do endereço dele; senão o legado `/anuncios/<uid>` (redireciona). Erro →
 * `null` (bloco opcional). Organizador pausado/arquivado não é achado: o link some.
 */
export async function fetchOrganizer(
  service: ServiceRecord,
  eventCity: RoutableCity | null
): Promise<ServiceOrganizer | null> {
  const tags = codigoCandidates(serviceTagsOf(service), MAX_ORGANIZER_TAGS);
  if (tags.length === 0) return null;
  try {
    const found = await resolveServiceRefs(tags, eventCity, { excludeUid: service.uid, byUid: false });
    const venue = tags.map((t) => found.get(t)).find(Boolean);
    return venue ? { uid: venue.uid, title: venue.title, href: venue.href } : null;
  } catch {
    return null;
  }
}

export type ResolveRefsOptions = {
  /** Uid que nunca é resolvido (o próprio anúncio). */
  excludeUid?: string;
  /** Valores não achados por `codigo` são tentados como uid (default `true`). */
  byUid?: boolean;
};

/**
 * Resolve referências a outros anúncios ATIVOS (`active` + `status='active'`) — genérico, não conhece
 * o campo de origem (local, pontos de venda, organizador, artistas…). Cada valor é tentado primeiro
 * como `extras.codigo` (uma consulta em lote, código repetido → o mais antigo) e, se não achado e
 * `byUid`, como uid (outra consulta em lote). Devolve `Map<valor original, ServiceVenue>` só com os
 * achados. Endereços (link/endereço/cidade) vêm em paralelo, um por anúncio achado. Lança em erro de
 * rede da busca principal — quem chama decide o fallback.
 */
export async function resolveServiceRefs(
  codes: string[],
  eventCity: RoutableCity | null,
  { excludeUid, byUid = true }: ResolveRefsOptions = {}
): Promise<Map<string, ServiceVenue>> {
  const values = [...new Set(codes.map(clean).filter(Boolean))];
  const houses = new Map<string, ServiceRecord>();
  const usable = (r: ServiceRecord | undefined): r is ServiceRecord =>
    Boolean(r?.uid && r.uid !== excludeUid && r.title);

  const byCode = new Map(values.map((v) => [v, normalizeServiceTag(v)] as const));
  const codigos = [...new Set([...byCode.values()].filter((c): c is string => !!c && CODIGO_PATTERN.test(c)))];
  if (codigos.length > 0) {
    const where: Record<string, string> = { 'extras->>codigo': `in.(${codigos.join(',')})` };
    if (excludeUid) where.uid = `neq.${excludeUid}`;
    const rows = await serverFetchResource<ServiceRecord>(
      'services',
      { active: 'true', status: 'active' },
      { auth: null, limit: codigos.length * 2, orderBy: 'created_at', orderDirection: 'asc', where }
    );
    for (const v of values) {
      const code = byCode.get(v);
      const hit = code ? rows.find((r) => usable(r) && codigoOf(r) === code) : undefined;
      if (hit) houses.set(v, hit);
    }
  }

  const pending = values.filter((v) => !houses.has(v) && v !== excludeUid && /^[\w-]+$/.test(v));
  if (byUid && pending.length > 0) {
    const rows = await serverFetchResource<ServiceRecord>(
      'services',
      { active: 'true', status: 'active' },
      { auth: null, limit: pending.length, where: { uid: `in.(${pending.join(',')})` } }
    );
    for (const v of pending) {
      const hit = rows.find((r) => usable(r) && r.uid === v);
      if (hit) houses.set(v, hit);
    }
  }

  const entries = await Promise.all(
    [...houses].map(async ([v, house]) => [v, await venueOf(house, eventCity)] as const)
  );
  return new Map(entries);
}

async function venueOf(house: ServiceRecord, eventCity: RoutableCity | null): Promise<ServiceVenue> {
  const addresses = await fetchAddresses(house);
  const isPrimary = (a: ServiceAddressRow) => Boolean(a.isPrimary ?? a.is_primary);
  const main = addresses.find(isPrimary) ?? addresses[0];
  return {
    uid: house.uid,
    title: house.title,
    href: organizerHref(house, eventCity, addresses),
    photo: photosFor(house)[0] ?? null,
    address: buildServiceLocation(addresses)?.address || null,
    cityName: clean(main?.city) || null,
  };
}

export type ServiceSalePoint = { label: string; venue: ServiceVenue | null };
/** Item de lista que pode apontar para um anúncio (pontos de venda, artistas…). */
export type ServiceLinkedItem = ServiceSalePoint;

export type ServiceLinkedRefs = {
  venue: ServiceVenue | null;
  salePoints: ServiceLinkedItem[];
  artists: ServiceLinkedItem[];
};

/** `nome` de cada item de uma lista de `extras` (`[{ nome }]` ou strings), aparado, sem vazios. */
function listNames(raw: unknown): string[] {
  return (Array.isArray(raw) ? raw : [])
    .map((item) => clean(item && typeof item === 'object' ? (item as { nome?: unknown }).nome : item))
    .filter(Boolean);
}

/**
 * Todas as referências do anúncio a outros anúncios numa resolução só (`resolveServiceRefs`: uma
 * consulta por codigo + no máximo uma por uid):
 * - `venue`: `extras.local_ref` (uid ou código); senão a primeira tag que é `extras.codigo` de outro.
 * - `salePoints`: `extras.pontos_de_venda[].nome` como código; achado → título do anúncio, senão
 *   `humanizeSlug(nome)`.
 * - `artists`: `extras.artistas[].nome` → `slugify(nome)` como código; senão o nome original.
 * Listas na ordem do formulário. Erro de rede → sem venues (rótulos continuam).
 * Cada campo vem de `extras`; vazio ou ausente → das respostas do formulário (`extraFields`, já
 * carregadas pela página — sem consulta extra; `serviceRefExtras`).
 */
export async function fetchLinkedRefs(
  service: ServiceRecord,
  eventCity: RoutableCity | null,
  extraFields?: ServiceExtraFields
): Promise<ServiceLinkedRefs> {
  const extras = serviceRefExtras(service, extraFields);
  const ref = clean(extras.local_ref);
  const localRef = ref && ref !== service.uid ? ref : '';
  const tags = codigoCandidates(serviceTagsOf(service), MAX_ORGANIZER_TAGS);
  const saleNames = listNames(extras.pontos_de_venda);
  const artistNames = listNames(extras.artistas);
  const artistCodes = artistNames.map((n) => slugify(n));

  const values = [localRef, ...tags, ...saleNames, ...artistCodes].filter(Boolean);
  const found =
    values.length === 0
      ? new Map<string, ServiceVenue>()
      : await resolveServiceRefs(values, eventCity, { excludeUid: service.uid }).catch(
          () => new Map<string, ServiceVenue>()
        );

  return {
    venue: (localRef ? found.get(localRef) : undefined) ?? tags.map((t) => found.get(t)).find(Boolean) ?? null,
    salePoints: saleNames.map((name) => {
      const venue = found.get(name) ?? null;
      return { label: venue?.title ?? humanizeSlug(name), venue };
    }),
    artists: artistNames.map((name, i) => {
      const venue = (artistCodes[i] && found.get(artistCodes[i])) || null;
      return { label: venue?.title ?? name, venue };
    }),
  };
}

/** Local do evento (ver `fetchLinkedRefs`). Erro → `null`. */
export async function fetchVenue(service: ServiceRecord, eventCity: RoutableCity | null): Promise<ServiceVenue | null> {
  return (await fetchLinkedRefs(service, eventCity)).venue;
}

/** Pontos de venda (ver `fetchLinkedRefs`). */
export async function fetchSalePoints(
  service: ServiceRecord,
  eventCity: RoutableCity | null
): Promise<ServiceSalePoint[]> {
  return (await fetchLinkedRefs(service, eventCity)).salePoints;
}

async function fetchAddresses(house: ServiceRecord): Promise<ServiceAddressRow[]> {
  try {
    const rows = await serverFetchResource<ServiceAddressRow>(
      'service_addresses',
      { service_id: house.id, active: 'true' },
      { auth: null, limit: 5, orderBy: 'is_primary', orderDirection: 'desc' }
    );
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function organizerHref(
  house: ServiceRecord,
  eventCity: RoutableCity | null,
  addresses: ServiceAddressRow[]
): string {
  const ibgeOf = (a: ServiceAddressRow) => String(a.cityIbge ?? a.city_ibge ?? '').trim();
  if (eventCity && addresses.some((a) => ibgeOf(a) === eventCity.ibge)) {
    return cityPath(eventCity, `/anuncio/${house.uid}`);
  }
  const named = addresses.find((a) => clean(a.city) && /^[A-Za-z]{2}$/.test(clean(a.state)));
  return serviceHref({ uid: house.uid, city: named?.city ?? null, state: named?.state ?? null });
}

export async function loadServiceDetail(uid: string): Promise<ServiceDetailData | null> {
  const fetched = await fetchService(uid);
  if (!fetched) return null;
  const service = await ensureServiceTaxonomy(fetched);

  // relacionados esperam só os carrosséis por tag (pra não repetir card); sem tag, saem na hora
  const tagRailsPromise = fetchTagRails(service);
  const uidsOf = (rails: ServiceTagRailResult[]) =>
    new Set(rails.flatMap((rail) => rail.items.map((item) => item.uid)));
  const [subcategoryNames, provider, extraFields, tagRails, related] = await Promise.all([
    fetchSubcategoryNames(service),
    fetchProviderProfile(service.uid),
    fetchExtraFields(service.uid),
    tagRailsPromise,
    tagRailsPromise.then((rails) => fetchRelatedServices(service, uidsOf(rails))),
  ]);
  const tagUids = uidsOf(tagRails);
  const randomServices = await fetchRandomServices(
    service,
    new Set([...tagUids, ...related.items.map((item) => item.uid)])
  );

  const { city, location } = await fetchServiceCityAndLocation(service, provider);
  const [siblings, { venue, salePoints, artists }] = await Promise.all([
    fetchServiceSiblings(service, city?.ibge, projectRegions),
    fetchLinkedRefs(service, city, extraFields),
  ]);
  const organizer: ServiceOrganizer | null = venue
    ? { uid: venue.uid, title: venue.title, href: venue.href }
    : null;

  return {
    service,
    subcategoryNames,
    provider,
    extraFields,
    related,
    tagRails,
    randomServices,
    city,
    siblings,
    location,
    organizer,
    venue,
    salePoints,
    artists,
  };
}
