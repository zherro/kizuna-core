import { pgrstRpc } from '../postrest/conn';
import { withProjectRegionCities } from '../regions';
import { projectBoostPlacement } from '../marketing/boost-config';
import { sponsoredMaxParam } from '../../shared/marketing/boost-placement';
import { SEARCH_RPC, type SearchAdsBody, type ServiceResult } from '../../client/components/search/search-types';

/** Seed determinístico em [-1, 1) pro `setseed()` da RPC, pra uma lista ficar estável entre
 * renders/ISR em vez de embaralhar a cada hit. */
export function seedFromKey(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) % 2_000_000;
  }
  return hash / 1_000_000 - 1;
}

/** Roda a RPC pública de busca (`fn_search_services`, anônima) — sem filtro algum além dos
 * `overrides` (com `p_city_ibge`, as cidades irmãs de `regions` entram junto). Erro de rede/HTTP
 * vira lista vazia: quem chama é uma seção opcional da página. */
export async function runServiceSearch(
  overrides: Partial<SearchAdsBody>,
  seed: number
): Promise<ServiceResult[]> {
  return runSearchRpc(searchBody(overrides, seed)).catch(() => []);
}

/** Vagas patrocinadas padrão das listas do servidor (`marketing.boost.listSlots`); quem quer outro
 * número (trilhas da home: `railPool`) passa `p_sponsored_max` nos overrides. */
function defaultSponsored(): Partial<SearchAdsBody> {
  const max = sponsoredMaxParam(projectBoostPlacement, projectBoostPlacement.listSlots);
  return max === undefined ? {} : { p_sponsored_max: max };
}

function searchBody(overrides: Partial<SearchAdsBody>, seed: number): SearchAdsBody {
  return withProjectRegionCities({
    ...defaultSponsored(),
    p_state: null,
    p_city_id: null,
    p_city_ibge: null,
    p_group_category_slug: null,
    p_category_id: null,
    p_subcategories: null,
    p_query: null,
    p_seed: seed,
    p_page: 0,
    p_page_size: 12,
    ...overrides,
  });
}

/** Como `runServiceSearch`, mas erro de rede/HTTP LANÇA — para quem tem fallback (ex.: parâmetro
 * que só existe numa migração mais nova). */
export async function runServiceSearchStrict(
  overrides: Partial<SearchAdsBody>,
  seed: number
): Promise<ServiceResult[]> {
  return runSearchRpc(searchBody(overrides, seed));
}

async function runSearchRpc(body: SearchAdsBody): Promise<ServiceResult[]> {
  let response = await pgrstRpc(SEARCH_RPC, body, { auth: null, schema: 'public' });
  // Banco sem a search 0014 recusa `p_sponsored_max`: repete sem a chave (lista orgânica, como antes).
  if (!response.ok && body.p_sponsored_max !== undefined) {
    const { p_sponsored_max: _s, ...rest } = body;
    response = await pgrstRpc(SEARCH_RPC, rest, { auth: null, schema: 'public' });
  }
  if (!response.ok) throw new Error(`${SEARCH_RPC}: HTTP ${response.status}`);
  const rows = (await response.json().catch(() => null)) as ServiceResult[] | null;
  return Array.isArray(rows) ? rows : [];
}
