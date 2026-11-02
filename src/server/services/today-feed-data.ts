import { unstable_cache } from 'next/cache';
import { serverFetchResource } from '../postgrest-crud';
import type { ServiceResult } from '../../client/components/search/search-types';
import type { TodayScope, TodayWhen } from '../../shared/today-config';
import { runServiceSearch, seedFromKey } from './service-search';

/**
 * Dados da página "Hoje": seções (categoria ou grupo) lidas pela MESMA RPC pública da busca
 * (`fn_search_services`), na ordem em que o projeto as configura — a ordem é a relevância. Genérico:
 * só conhece os slugs que o projeto passa (`today.sections` no kizuna.config.json), como as trilhas
 * da home (`home.categoryRails`). Seção sem item não aparece.
 */

export const TODAY_TIME_ZONE = 'America/Cuiaba';
export const DEFAULT_TODAY_LIMIT = 8;
/** Quantos anúncios buscar para filtrar pela janela de datas (`when`), já em ordem de data. */
const DATED_POOL = 60;
/** "week" = hoje e os próximos 6 dias. */
const WEEK_DAYS = 7;
export const TODAY_CACHE_SECONDS = 300;

export type TodaySectionConfig = {
  /** slug da categoria (`categories.slug`) — use este OU `group` */
  slug?: string;
  /** slug do grupo de categoria (`categories_group.slug`) — use este OU `slug` */
  group?: string;
  title?: string;
  limit?: number;
  /** Só anúncios cujo início cai hoje — o mesmo que `when: 'today'`. */
  onlyToday?: boolean;
  /** Janela de datas pelo início do anúncio (eventos), do mais cedo ao mais tarde. Sem ela, sem filtro de data. */
  when?: TodayWhen;
  /** "city" (padrão): só a cidade; "region": a cidade + irmãs; "nearby": só as irmãs. */
  scope?: TodayScope;
  /** Mantém a seção sem item, com este aviso no lugar dos cards. */
  emptyText?: string;
};

export type TodaySection = {
  id: string;
  title: string;
  kind: 'category' | 'group';
  category: { id: number; name: string; slug: string };
  items: ServiceResult[];
  hasMore: boolean;
  onlyToday: boolean;
  when: TodayWhen | null;
  /** Só vem quando a seção pode aparecer vazia (`items` = []). */
  emptyText?: string;
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

/** Dia de início do anúncio (AAAA-MM-DD local): `event_start` ou, sem ele, o dia do `expires_at`. */
export function eventDay(item: Pick<ServiceResult, 'event_start' | 'expires_at'>): string | null {
  const m = typeof item.event_start === 'string' ? item.event_start.match(/^(\d{4}-\d{2}-\d{2})/) : null;
  if (m) return m[1];
  const end = item.expires_at ? new Date(item.expires_at) : null;
  return end && !Number.isNaN(end.getTime()) ? localDayKey(end) : null;
}

/** `day` (AAAA-MM-DD) + `n` dias. */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** O dia `d` cai na janela `when` contada a partir de `today`? */
export function inWindow(d: string | null, when: TodayWhen, today: string): boolean {
  if (!d) return false;
  if (when === 'today') return d === today;
  if (when === 'week') return d >= today && d < addDays(today, WEEK_DAYS);
  return d > today;
}

export type LoadTodayFeedOptions = {
  now?: Date;
  cityIbge?: string;
  /** A cidade e as irmãs (`regions`): a 1ª é a selecionada. */
  cityIbges?: string[];
};

async function fetchSection(
  config: TodaySectionConfig,
  day: string,
  /** Cidades da busca, já resolvidas pelo `scope`; null = sem filtro de cidade. */
  cities: string[] | null
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
  const when = config.when ?? (config.onlyToday === true ? 'today' : null);
  const found = await runServiceSearch(
    {
      ...(kind === 'group' ? { p_group_category_slug: row.slug } : { p_category_id: id }),
      p_page_size: when ? DATED_POOL : limit + 1,
      p_city_ibge: cities?.[0] ?? null,
      // lista explícita (mesmo de uma cidade só): assim a busca não junta as irmãs sozinha
      ...(cities ? { p_city_ibges: cities } : {}),
      ...(when ? { p_order: 'event_start' } : {}),
    },
    // Semente fixa por dia e seção: a lista não embaralha a cada visita.
    seedFromKey(`${day}:${row.slug}`)
  );

  const items = when
    ? found
        .map((s) => ({ s, d: eventDay(s) }))
        .filter(({ d }) => inWindow(d, when, day))
        .sort((a, b) => (a.d ?? '').localeCompare(b.d ?? '') || (a.s.event_start ?? '').localeCompare(b.s.event_start ?? ''))
        .map(({ s }) => s)
    : found;
  const emptyText = config.emptyText?.trim();
  if (items.length === 0 && !emptyText) return null;

  return {
    id: `${kind}:${row.slug}:${when ?? 'all'}:${config.scope ?? 'city'}`,
    title: config.title?.trim() || row.name,
    kind,
    category: { id, name: row.name, slug: row.slug },
    items: items.slice(0, limit),
    hasMore: items.length > limit,
    onlyToday: when === 'today',
    when,
    ...(items.length === 0 && emptyText ? { emptyText } : {}),
  };
}

/** Cidades da seção pelo `scope`; `undefined` = a seção não se aplica (ex.: "nearby" sem irmãs). */
function scopeCities(
  scope: TodayScope | undefined,
  cityIbge: string | undefined,
  cityIbges: string[] | undefined
): string[] | null | undefined {
  const city = cityIbge ?? cityIbges?.[0];
  if (!city) return scope === 'nearby' ? undefined : null;
  const region = cityIbges?.length ? cityIbges : [city];
  if (scope === 'region') return region;
  if (scope === 'nearby') {
    const others = region.filter((c) => c !== city);
    return others.length ? others : undefined;
  }
  return [city];
}

const cachedSection = unstable_cache(fetchSection, ['today-section'], {
  revalidate: TODAY_CACHE_SECONDS,
  tags: ['today-feed'],
});

/**
 * Seções do "Hoje", na ordem da configuração; falha ou categoria inexistente só tira a própria seção.
 * Seção "nearby" sem cidade irmã (ou sem cidade) não aparece.
 */
export async function loadTodayFeed(
  sections: TodaySectionConfig[],
  { now = new Date(), cityIbge, cityIbges }: LoadTodayFeedOptions = {}
): Promise<TodaySection[]> {
  const day = localDayKey(now);
  const loaded = await Promise.all(
    sections.map((s) => {
      const cities = scopeCities(s.scope, cityIbge, cityIbges);
      return cities === undefined ? null : cachedSection(s, day, cities).catch(() => null);
    })
  );
  return loaded.filter((s): s is TodaySection => s !== null);
}
