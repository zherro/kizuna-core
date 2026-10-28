import type { TodaySection } from '../../../server/services/today-feed-data';

/** Fuso do "hoje" — o mesmo do carregador (`TODAY_TIME_ZONE`), repetido aqui para não puxar código de servidor para o cliente. */
export const TODAY_DISPLAY_TIME_ZONE = 'America/Cuiaba';

/** Data por extenso em pt-BR no fuso de Cuiabá: "quarta-feira, 28 de outubro". */
export function formatTodayDate(now: Date = new Date(), timeZone: string = TODAY_DISPLAY_TIME_ZONE): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone, weekday: 'long', day: 'numeric', month: 'long' }).format(now);
}

export type TodayCity = { name: string; state: string; ibge: string | number };

/** Link do "Ver mais" da seção: a busca já filtrada pela categoria/grupo (e pela cidade, quando há). */
export function todaySearchHref(
  section: Pick<TodaySection, 'kind' | 'category'>,
  city?: TodayCity | null
): string {
  const filter = section.kind === 'group' ? `group=${section.category.slug}` : `categoryId=${section.category.id}`;
  const cityQuery = city
    ? `&state=${city.state}&cityId=${city.ibge}&cityName=${encodeURIComponent(city.name)}`
    : '';
  return `/busca?${filter}${cityQuery}`;
}

/** Subtítulo da seção: só a seção "só hoje" tem contagem que faz sentido. */
export function todaySectionSubtitle(section: Pick<TodaySection, 'onlyToday' | 'items'>): string | undefined {
  if (!section.onlyToday) return undefined;
  const n = section.items.length;
  return n === 1 ? '1 começa hoje' : `${n} começam hoje`;
}
