import type { ServiceResult } from '../../client/components/search/search-types';

/**
 * Regras puras da vitrine "sem filtro" da /busca (`search.browseGroups`), compartilhadas entre o
 * cliente (`SearchBrowseRails`) e o servidor (`loadBrowseRails`) — sem 'use client' pra poderem
 * rodar nos dois lados.
 */

/** Itens por trilha da vitrine. */
export const RAIL_LIMIT = 12;

/** Ordenação da RPC (`fn_search_services.p_order`, search 0011): `'relevance'` ou
 * `'<campo>[:asc|desc]'` com campo de `ORDER_FIELDS` (colunas de `services`). */
export type SearchOrder = string;
export const ORDER_FIELDS = ['occurs_at', 'created_at', 'expires_at', 'price', 'title'] as const;
const ORDER_ALIASES: Record<string, string> = {
  event_start: 'expires_at:asc',
  recent: 'created_at:desc',
};

/** Normaliza `'campo[:dir]'` (ou apelido) para `'campo:asc|desc'`; inválido = `'relevance'`. */
export function normalizeOrder(raw: string | null | undefined): SearchOrder {
  const value = (raw ?? '').trim().toLowerCase();
  const spec = ORDER_ALIASES[value] ?? value;
  const [field, dir = 'asc'] = spec.split(':');
  if (!(ORDER_FIELDS as readonly string[]).includes(field) || (dir !== 'asc' && dir !== 'desc')) {
    return 'relevance';
  }
  return `${field}:${dir}`;
}

/** Ordenação configurada para o grupo (`orderByGroup[slug]`, senão `default`, senão relevância). */
export function orderForGroup(
  orderByGroup: Record<string, string> | undefined,
  groupSlug: string | null
): SearchOrder {
  const raw = (groupSlug && orderByGroup?.[groupSlug]) || orderByGroup?.default;
  return normalizeOrder(raw);
}

/** Item de `search.browseGroups`: um grupo, ou vários grupos juntos numa trilha só. */
export type BrowseRailConfig = string | { groups: string[]; title?: string };
export type BrowseRail = { groups: string[]; title?: string };
export type BrowseRailLoaded = { rail: BrowseRail; items: ServiceResult[]; hasMore: boolean };

/** Trilhas já carregadas no servidor (`loadBrowseRails`), prontas pra hidratar sem refetch. */
export type BrowseRailsData = {
  /** Cidade (IBGE) selecionada com que foi gerado. */
  cityIbge: string;
  /** `JSON.stringify(trilhas)` — só vale se igual ao das trilhas em vigor no cliente. */
  signature: string;
  rails: BrowseRailLoaded[];
  /** Nome de cada grupo usado (slug → nome), pra o título sem esperar a taxonomia do cliente. */
  groupNames: Record<string, string>;
};

/** Normaliza `search.browseGroups` (strings e/ou `{ groups, title }`); itens vazios saem. */
export function normalizeBrowseRails(raw: readonly BrowseRailConfig[] | null | undefined): BrowseRail[] {
  return (raw ?? [])
    .map((item) =>
      typeof item === 'string'
        ? { groups: [item.trim()].filter(Boolean) }
        : { groups: (item.groups ?? []).map((g) => g.trim()).filter(Boolean), title: item.title?.trim() || undefined }
    )
    .filter((rail) => rail.groups.length > 0);
}

/** Junta as listas de vários grupos alternando entre elas (sem repetir), até `limit`. */
export function interleave(lists: ServiceResult[][], limit: number): ServiceResult[] {
  const out: ServiceResult[] = [];
  const seen = new Set<string>();
  for (let i = 0; out.length < limit && lists.some((l) => i < l.length); i += 1) {
    for (const list of lists) {
      const item = list[i];
      if (item && !seen.has(item.uid) && out.length < limit) {
        seen.add(item.uid);
        out.push(item);
      }
    }
  }
  return out;
}

/** Monta a trilha a partir das listas (uma por grupo): itens alternados e `hasMore`. */
export function buildRail(rail: BrowseRail, lists: ServiceResult[][]): BrowseRailLoaded {
  const items = interleave(lists, RAIL_LIMIT);
  const total = lists.reduce((n, l) => n + l.length, 0);
  return { rail, items, hasMore: total > items.length || lists.some((l) => l.length >= RAIL_LIMIT) };
}

/**
 * O que veio do servidor ainda vale? Mesma configuração de trilhas e mesma cidade selecionada.
 * Cidade ainda desconhecida (`null`: o cliente só lê a localização depois de hidratar) conta
 * como válida — mostra o inicial em vez de buscar sem cidade.
 */
export function isInitialRailsUsable(
  initial: BrowseRailsData | null | undefined,
  rails: readonly BrowseRail[],
  cityIbge: string | number | null | undefined
): boolean {
  if (!initial || initial.signature !== JSON.stringify(rails)) return false;
  return cityIbge == null || String(cityIbge) === initial.cityIbge;
}
