'use client';

import { useEffect, useState } from 'react';
import type { SearchAdsBody, ServiceResult } from './search-types';
import { ServiceCarouselSection } from '../services/detail/service-carousel-section';
import { resolveCategoryHue, type ServiceDetailConfig } from '../services/detail/category-style';
import { RESULT_CARD_WIDTH } from '../ui-better-soft/lists/listing-result-card';
import { cn } from '../../../lib/utils';
import type { AnalyticsSource, EventRule } from '../../../shared/analytics';

const RAIL_LIMIT = 12;

/** Item de `search.browseGroups`: um grupo, ou vários grupos juntos numa trilha só. */
export type BrowseRailConfig = string | { groups: string[]; title?: string };
export type BrowseRail = { groups: string[]; title?: string };

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

type Loaded = { rail: BrowseRail; items: ServiceResult[]; hasMore: boolean };

/**
 * Busca "sem filtro" (só a cidade): em vez da lista misturada, um carrossel por item de
 * `search.browseGroups` do kizuna.config.json, na ordem — estilo vitrine por seção. Cada grupo é a
 * mesma RPC da busca com o grupo marcado (cidade/região de `baseBody`); uma trilha com vários grupos
 * alterna os itens deles. O "Ver mais" leva à busca do primeiro grupo. Trilha sem anúncio some.
 * Quem decide QUANDO mostrar isto é a página (`SearchPage`).
 */
export function SearchBrowseRails({
  rails: railConfig,
  baseBody,
  runSearch,
  orderFor,
  groupNameOf,
  hrefFor,
  detailConfig,
  impressionRule,
  source,
  emptyLabel,
}: {
  /** Trilhas na ordem (`normalizeBrowseRails(search.browseGroups)`). */
  rails: BrowseRail[];
  /** Corpo da RPC com a localização em vigor; grupo/categoria/texto são sobrescritos por trilha. */
  baseBody: SearchAdsBody;
  runSearch: (body: SearchAdsBody, signal: AbortSignal) => Promise<ServiceResult[]>;
  /** Ordenação do grupo (`search.orderByGroup`); `relevance` = ordem de sempre. */
  orderFor: (slug: string) => string;
  groupNameOf: (slug: string) => string | null;
  /** Link da busca filtrada pelo grupo (card "Ver mais"). */
  hrefFor: (slug: string) => string;
  detailConfig?: ServiceDetailConfig | null;
  impressionRule?: EventRule | null;
  source?: AnalyticsSource;
  /** Texto quando nenhum grupo tem anúncio na cidade. */
  emptyLabel?: string;
}) {
  const [rails, setRails] = useState<Loaded[] | null>(null);
  // Só a localização dispara nova carga (o seed muda a cada render de quem chama).
  const locationKey = JSON.stringify([
    baseBody.p_state,
    baseBody.p_city_id,
    baseBody.p_city_ibge,
    baseBody.p_city_ibges,
    railConfig,
  ]);

  useEffect(() => {
    const controller = new AbortController();
    setRails(null);
    const fetchGroup = async (slug: string): Promise<ServiceResult[]> => {
      const order = orderFor(slug);
      const body: SearchAdsBody = {
        ...baseBody,
        p_group_category_slug: slug,
        p_category_id: null,
        p_category_ids: null,
        p_subcategories: null,
        p_query: null,
        // com o grupo marcado não é resultado misto: nada de categoria escondida
        p_exclude_category_slugs: null,
        p_page: 0,
        p_page_size: RAIL_LIMIT,
      };
      // como na busca: só manda `p_order` com ordenação configurada (RPC antiga recusa a chave)
      if (order !== 'relevance') body.p_order = order;
      else delete body.p_order;
      return runSearch(body, controller.signal).catch(() => [] as ServiceResult[]);
    };
    Promise.all(
      railConfig.map(async (rail): Promise<Loaded> => {
        const lists = await Promise.all(rail.groups.map(fetchGroup));
        const items = interleave(lists, RAIL_LIMIT);
        const total = lists.reduce((n, l) => n + l.length, 0);
        return { rail, items, hasMore: total > items.length || lists.some((l) => l.length >= RAIL_LIMIT) };
      })
    ).then((loaded) => {
      if (!controller.signal.aborted) setRails(loaded);
    });
    return () => controller.abort();
    // baseBody/runSearch/orderFor entram via locationKey (identidade muda a cada render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationKey]);

  if (rails === null) {
    return (
      <div className="space-y-10" aria-busy="true" aria-label="Carregando">
        {railConfig.slice(0, 3).map((rail) => (
          <div key={rail.groups.join('+')} className="space-y-4">
            <div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={cn(RESULT_CARD_WIDTH, 'h-72 shrink-0 animate-pulse rounded-xl bg-muted')} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const filled = rails.filter((r) => r.items.length > 0);
  if (filled.length === 0) {
    return emptyLabel ? (
      <p className="rounded-[var(--ui-radius-card-sm,0.5rem)] border-[length:var(--ui-border-w-card,1px)] border-dashed border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    ) : null;
  }

  return (
    <div className="space-y-12">
      {filled.map(({ rail, items, hasMore }) => (
        <ServiceCarouselSection
          key={rail.groups.join('+')}
          title={rail.title ?? rail.groups.map((g) => groupNameOf(g) ?? g).join(' e ')}
          services={items}
          hue={resolveCategoryHue({ groupSlug: rail.groups[0] }, detailConfig)}
          detailConfig={detailConfig}
          className=""
          moreHref={hasMore ? hrefFor(rail.groups[0]) : undefined}
          showCity
          impressionRule={impressionRule}
          source={source}
        />
      ))}
    </div>
  );
}
