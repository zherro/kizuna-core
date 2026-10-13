import { serverFetchResource } from '../postgrest-crud';
import { pgrstRpc } from '../postrest/conn';
import { runServiceSearch, seedFromKey } from './service-search';
import { listLocationCities } from '../location';
import type { RoutableCity } from '../../shared/city-routing/city-slug';
import { pickServiceCity, type ServiceAddressLike } from './service-city';
import { fetchServiceSiblings, type ServiceSibling } from './service-siblings';
import { projectRegions } from '../regions';
import type { FormSchema, FormValues } from '../../client/components/form-builder';
import type { ServiceRecord } from '../../client/components/services/service-type';
import type { ServiceResult } from '../../client/components/search/search-types';

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

export type ServiceDetailData = {
  service: ServiceRecord;
  subcategoryNames: string[];
  provider: ProviderProfile | null;
  extraFields: ServiceExtraFields;
  related: RelatedResult;
  randomServices: ServiceResult[];
  /** Cidade canônica do anúncio (URL fixa `/[cidade]/anuncio/[uid]`); `null` = sem cidade resolvível. */
  city: RoutableCity | null;
  /** O mesmo anúncio nas cidades irmãs de `city` (`regions`) — ex.: o filme em cartaz em VG. */
  siblings: ServiceSibling[];
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
async function fetchRelatedServices(service: ServiceRecord): Promise<RelatedResult> {
  const seed = seedFromKey(service.uid);
  const exclude = (rows: ServiceResult[]) =>
    rows.filter((row) => row.uid !== service.uid).slice(0, 8);

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

/** Endereços + lista de cidades atendidas → cidade canônica (ver `pickServiceCity`). */
async function fetchServiceCity(
  service: ServiceRecord,
  provider: ProviderProfile | null
): Promise<RoutableCity | null> {
  const [addresses, cities] = await Promise.all([
    serverFetchResource<ServiceAddressLike>(
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
  return pickServiceCity(addresses, provider, cities);
}

export async function loadServiceDetail(uid: string): Promise<ServiceDetailData | null> {
  const fetched = await fetchService(uid);
  if (!fetched) return null;
  const service = await ensureServiceTaxonomy(fetched);

  const [subcategoryNames, provider, extraFields, related] = await Promise.all([
    fetchSubcategoryNames(service),
    fetchProviderProfile(service.uid),
    fetchExtraFields(service.uid),
    fetchRelatedServices(service),
  ]);
  const randomServices = await fetchRandomServices(
    service,
    new Set(related.items.map((item) => item.uid))
  );

  const city = await fetchServiceCity(service, provider);
  const siblings = await fetchServiceSiblings(service, city?.ibge, projectRegions);

  return { service, subcategoryNames, provider, extraFields, related, randomServices, city, siblings };
}
