import { unstable_cache } from 'next/cache';
import { serverFetchResource } from '../postgrest-crud';
import type { ServiceResult } from '../../client/components/search/search-types';
import { runServiceSearch, seedFromKey } from './service-search';

/**
 * Dados da página "Hoje": seções (categoria ou grupo) lidas pela MESMA RPC pública da busca
 * (`fn_search_services`), na ordem em que o projeto as configura — a ordem é a relevância. Genérico:
 * só conhece os slugs que o projeto passa (`today.sections` no kizuna.config.json), como as trilhas
 * da home (`home.categoryRails`). Seção sem item não aparece.
 */

export const TODAY_TIME_ZONE = 'America/Cuiaba';
export const DEFAULT_TODAY_LIMIT = 8;
/** Quantos anúncios buscar para filtrar "começa hoje" (o resto da lista são dias futuros). */
const ONLY_TODAY_POOL = 60;
export const TODAY_CACHE_SECONDS = 300;

export type TodaySectionConfig = {
  /** slug da categoria (`categories.slug`) — use este OU `group` */
  slug?: string;
  /** slug do grupo de categoria (`categories_group.slug`) — use este OU `slug` */
  group?: string;
  title?: string;
  limit?: number;
  /** Só anúncios cujo início cai hoje (eventos), do horário mais cedo ao mais tarde. */
  onlyToday?: boolean;
  /** "city" (padrão): só a cidade; "region": a cidade + irmãs da região. */
  scope?: 'city' | 'region';
};

export type TodaySection = {
  id: string;
  title: string;
  kind: 'category' | 'group';
  category: { id: number; name: string; slug: string };
  items: ServiceResult[];
  hasMore: boolean;
  onlyToday: boolean;
};

type TaxonomyRow = { id: number | string; name: string; slug: string };

/** Dia local (AAAA-MM-DD) no fuso de Cuiabá. */
export function localDayKey(now: Date, timeZone: string = TODAY_TIME_ZONE): string {
  // `en-CA` formata como AAAA-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** `event_start` (AAAA-MM-DD ou AAAA-MM-DDTHH:MM, hora local) começa no dia `day`? */
export function startsOnDay(eventStart: string | null | undefined, day: string): boolean {
  const m = typeof eventStart === 'string' ? eventStart.match(/^(\d{4}-\d{2}-\d{2})(?:[T ]\d{2}:\d{2})?/) : null;
  return m !== null && m[1] === day;
}

export type LoadTodayFeedOptions = {
  now?: Date;
  cityIbge?: string;
  /** Cidades irmãs (`regions`): a 1ª é a selecionada. */
  cityIbges?: string[];
};

async function fetchSection(
  config: TodaySectionConfig,
  day: string,
  cityIbge: string | undefined,
  cityIbges: string[] | undefined
): Promise<TodaySection | null> {
  const kind = config.group ? 'group' : 'category';
  const slug = (config.group ?? config.slug ?? '').trim();
  if (!slug) return null;

  const rows = await serverFetchResource<TaxonomyRow>(
    kind === 'group' ? 'categories_group' : 'categories_public',
    { slug, active: 'true' },
    { auth: null, limit: 1 }
  );
  const row = rows[0];
  const id = Number(row?.id);
  if (!row || !Number.isFinite(id)) return null;

  const limit = config.limit && config.limit > 0 ? Math.floor(config.limit) : DEFAULT_TODAY_LIMIT;
  const onlyToday = config.onlyToday === true;
  const cities = cityIbges?.length ? cityIbges : null;
  const found = await runServiceSearch(
    {
      ...(kind === 'group' ? { p_group_category_slug: row.slug } : { p_category_id: id }),
      p_page_size: onlyToday ? ONLY_TODAY_POOL : limit + 1,
      p_city_ibge: cities?.[0] ?? cityIbge ?? null,
      ...(cities && cities.length > 1 ? { p_city_ibges: cities } : {}),
      ...(onlyToday ? { p_order: 'event_start' } : {}),
    },
    // Semente fixa por dia e seção: a lista não embaralha a cada visita.
    seedFromKey(`${day}:${row.slug}`)
  );

  const items = onlyToday
    ? found
        .filter((s) => startsOnDay(s.event_start, day))
        .sort((a, b) => (a.event_start ?? '').localeCompare(b.event_start ?? ''))
    : found;
  if (items.length === 0) return null;

  return {
    id: `${kind}:${row.slug}`,
    title: config.title?.trim() || row.name,
    kind,
    category: { id, name: row.name, slug: row.slug },
    items: items.slice(0, limit),
    hasMore: items.length > limit,
    onlyToday,
  };
}

const cachedSection = unstable_cache(fetchSection, ['today-section'], {
  revalidate: TODAY_CACHE_SECONDS,
  tags: ['today-feed'],
});

/** Seções do "Hoje", na ordem da configuração; falha ou categoria inexistente só tira a própria seção. */
export async function loadTodayFeed(
  sections: TodaySectionConfig[],
  { now = new Date(), cityIbge, cityIbges }: LoadTodayFeedOptions = {}
): Promise<TodaySection[]> {
  const day = localDayKey(now);
  const loaded = await Promise.all(
    sections.map((s) =>
      cachedSection(s, day, cityIbge, s.scope === 'region' ? cityIbges : undefined).catch(() => null)
    )
  );
  return loaded.filter((s): s is TodaySection => s !== null);
}
