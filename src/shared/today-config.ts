/**
 * Configuração da página "Hoje" (kizuna.config.json → `today.sections`), mesmo formato de
 * `home.categoryRails` mais `onlyToday`. A ordem do array é a ordem de relevância na página.
 *
 *   { "group": "eventos", "title": "Eventos de hoje", "onlyToday": true, "scope": "region", "limit": 12 }
 *   { "slug": "cinema", "title": "Cinema em cartaz", "scope": "region", "limit": 10 }
 *
 * Puro (sem dependências de servidor): serve ao servidor e a testes.
 */
export type TodaySectionInput = {
  slug?: string;
  group?: string;
  title?: string;
  limit?: number;
  onlyToday?: boolean;
  scope?: 'city' | 'region';
};

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
    return [
      {
        ...(group ? { group } : { slug }),
        ...(title ? { title } : {}),
        ...(limit ? { limit } : {}),
        ...(o.onlyToday === true ? { onlyToday: true } : {}),
        scope: o.scope === 'region' ? ('region' as const) : ('city' as const),
      },
    ];
  });
}
