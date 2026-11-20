/**
 * Visitas do site (analytics 0005, `fn_analytics_page_view_summary`): o banco já devolve os
 * visitantes-dia agrupados por dimensão; aqui só vira lista ordenada com participação e rótulo.
 * Cada visitante-dia cai em UMA linha por dimensão (a 1ª origem/cidade/aparelho do dia), então a
 * soma de uma dimensão dá o total.
 */

export type SiteSummaryRow = {
  dimension: string;
  key: string | null;
  visitors: number | string;
  pages: number | string;
};

export type SiteShare = { key: string; visitors: number; pages: number; share: number };

export type SiteVisitors = {
  visitors: number;
  pages: number;
  bySource: SiteShare[];
  byCampaign: SiteShare[];
  byCity: SiteShare[];
  byDevice: SiteShare[];
  empty: boolean;
};

/** Chave vazia: origem → "direto"; cidade/aparelho/campanha → "não informado". */
export const SITE_EMPTY_KEY = '';

const num = (v: number | string | null | undefined) => {
  const n = typeof v === 'number' ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export function buildSiteVisitors(rows: SiteSummaryRow[]): SiteVisitors {
  const total = rows.find((r) => r.dimension === 'total');
  const visitors = num(total?.visitors);
  const pages = num(total?.pages);
  const pick = (dimension: string): SiteShare[] =>
    rows
      .filter((r) => r.dimension === dimension)
      .map((r) => {
        const v = num(r.visitors);
        return {
          key: r.key ?? SITE_EMPTY_KEY,
          visitors: v,
          pages: num(r.pages),
          share: visitors > 0 ? Math.round((v / visitors) * 100) : 0,
        };
      })
      .filter((r) => r.visitors > 0)
      .sort((a, b) => b.visitors - a.visitors || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return {
    visitors,
    pages,
    bySource: pick('source'),
    byCampaign: pick('campaign'),
    byCity: pick('city'),
    byDevice: pick('device'),
    empty: visitors === 0,
  };
}

/** Rótulo de uma origem UTM para o painel ("" = Direto). */
export function utmSourceLabel(key: string): string {
  if (!key) return 'Direto (sem UTM)';
  const known: Record<string, string> = {
    instagram: 'Instagram',
    whatsapp: 'WhatsApp',
    facebook: 'Facebook',
    tiktok: 'TikTok',
    youtube: 'YouTube',
    google: 'Google',
    x: 'X (Twitter)',
    newsletter: 'Newsletter',
  };
  return known[key] ?? key;
}

/** Cidade do portal pelo slug (`cuiaba-mt` → `Cuiaba/MT`); sem acento porque o slug não tem. */
export function citySlugLabel(slug: string): string {
  if (!slug) return 'Não informada';
  const m = /^(.*)-([a-z]{2})$/.exec(slug);
  if (!m) return slug;
  const name = m[1]!
    .split('-')
    .filter(Boolean)
    .map((w) => (['de', 'da', 'do', 'das', 'dos', 'e'].includes(w) ? w : w[0]!.toUpperCase() + w.slice(1)))
    .join(' ');
  return `${name}/${m[2]!.toUpperCase()}`;
}
