/**
 * Configuração da página "Hoje" (kizuna.config.json → `today.sections`), mesmo formato de
 * `home.categoryRails` mais a janela de datas. A ordem do array é a ordem de relevância na página.
 *
 *   { "group": "eventos", "title": "Acontece hoje", "when": "today", "scope": "city", "emptyText": "Nada hoje." }
 *   { "group": "eventos", "title": "Acontece perto de você", "when": "week", "scope": "nearby" }
 *   { "group": "eventos", "title": "O que vem por aí", "when": "upcoming", "scope": "city" }
 *   { "slug": "cinema", "title": "Cinema em cartaz", "scope": "region", "limit": 10 }
 *
 * `when`: "today" (começa hoje), "week" (hoje e os próximos 6 dias), "upcoming" (de amanhã em diante).
 * `onlyToday: true` é o mesmo que `when: "today"` (formato antigo).
 * `scope`: "city" só a cidade; "region" a cidade + irmãs; "nearby" só as irmãs (sem a cidade).
 * `emptyText`: a seção aparece mesmo sem item, com este aviso (sem ele, seção vazia some).
 *
 * Puro (sem dependências de servidor): serve ao servidor e a testes.
 */
export type TodayWhen = 'today' | 'week' | 'upcoming';
export type TodayScope = 'city' | 'region' | 'nearby';

export type TodaySectionInput = {
  slug?: string;
  group?: string;
  title?: string;
  limit?: number;
  onlyToday?: boolean;
  when?: TodayWhen;
  scope?: TodayScope;
  emptyText?: string;
};

const WHENS: TodayWhen[] = ['today', 'week', 'upcoming'];
const SCOPES: TodayScope[] = ['city', 'region', 'nearby'];

/** Lê `today` do config: descarta item sem `slug`/`group`, normaliza tipos e ignora lixo. */
export function parseTodaySections(raw: unknown): TodaySectionInput[] {
  const list = (raw && typeof raw === 'object' ? (raw as { sections?: unknown }).sections : null) ?? null;
  if (!Array.isArray(list)) return [];
  return list.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const o = item as Record<string, unknown>;
    const group = typeof o.group === 'string' ? o.group.trim() : '';
    const slug = typeof o.slug === 'string' ? o.slug.trim() : '';
    if (!group && !slug) return [];
    const limit = typeof o.limit === 'number' && Number.isFinite(o.limit) && o.limit > 0 ? Math.floor(o.limit) : undefined;
    const title = typeof o.title === 'string' && o.title.trim() ? o.title.trim() : undefined;
    const emptyText = typeof o.emptyText === 'string' && o.emptyText.trim() ? o.emptyText.trim() : undefined;
    const when = WHENS.includes(o.when as TodayWhen)
      ? (o.when as TodayWhen)
      : o.onlyToday === true
        ? ('today' as const)
        : undefined;
    return [
      {
        ...(group ? { group } : { slug }),
        ...(title ? { title } : {}),
        ...(limit ? { limit } : {}),
        ...(when === 'today' ? { onlyToday: true } : {}),
        ...(when ? { when } : {}),
        ...(emptyText ? { emptyText } : {}),
        scope: SCOPES.includes(o.scope as TodayScope) ? (o.scope as TodayScope) : ('city' as const),
      },
    ];
  });
}
