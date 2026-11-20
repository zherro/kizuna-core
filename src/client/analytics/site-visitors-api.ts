import { periodBounds, type PeriodDays } from '../../shared/analytics/aggregate';
import { buildSiteVisitors, type SiteSummaryRow, type SiteVisitors } from '../../shared/analytics/site';

const SUMMARY_URL = '/api/resources/fn_analytics_page_view_summary';

/**
 * Visitas do site no período (analytics 0005): uma chamada à RPC agregada; a RLS só devolve dados
 * a quem tem `analytics/site` (root sempre). Erro HTTP → exceção (a tela mostra a falha).
 */
export async function fetchSiteVisitors(days: PeriodDays, signal?: AbortSignal): Promise<SiteVisitors> {
  const { from, to } = periodBounds(days);
  const res = await fetch(SUMMARY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_from: from, p_to: to }),
    cache: 'no-store',
    signal,
  });
  if (!res.ok) throw new Error(`page_view_summary ${res.status}`);
  const data = (await res.json().catch(() => null)) as SiteSummaryRow[] | { items?: SiteSummaryRow[] } | null;
  const rows = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  return buildSiteVisitors(rows);
}
