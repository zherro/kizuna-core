import { pgrstRpc } from '../postrest/conn';
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
 * `overrides`. Erro de rede/HTTP vira lista vazia: quem chama é uma seção opcional da página. */
export async function runServiceSearch(
  overrides: Partial<SearchAdsBody>,
  seed: number
): Promise<ServiceResult[]> {
  const body: SearchAdsBody = {
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
  };
  const response = await pgrstRpc(SEARCH_RPC, body, { auth: null, schema: 'public' }).catch(
    () => null
  );
  if (!response?.ok) return [];
  const rows = (await response.json().catch(() => null)) as ServiceResult[] | null;
  return Array.isArray(rows) ? rows : [];
}
