'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, Loader2, X } from 'lucide-react';
import {
  GOOGLE_CREATIVE_ID,
  dailySeries,
  groupStats,
  summarize,
  summarizeOwn,
  type AdCreative,
  type AdStatRow,
} from '../../../shared/ads';
import { Button } from '../ui/button';
import { EmptyStateCard } from '../ui-better-soft/lists/empty-state-card';
import { cn } from '../../../lib/utils';

const PAGE_SIZE = 1000;
const MAX_PAGES = 20;
const DAY_MS = 86_400_000;

export function rangeFrom(days: number, now = new Date()): string {
  return new Date(now.getTime() - (days - 1) * DAY_MS).toISOString().slice(0, 10);
}

/** Pagina `ad_stats_daily` (1000/página, no máx. 20 páginas) desde `from` (inclusive). */
export async function fetchAdStats(from: string): Promise<AdStatRow[]> {
  const rows: AdStatRow[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const params = new URLSearchParams({ pageSize: String(PAGE_SIZE), page: String(page) });
    params.set('filter.day.gte', from);
    const res = await fetch(`/api/resources/ad_stats_daily?${params.toString()}`, { cache: 'no-store' });
    const body = (await res.json().catch(() => null)) as { items?: AdStatRow[]; message?: string } | null;
    if (!res.ok) throw new Error(body?.message ?? 'Não foi possível carregar as métricas.');
    const items = body?.items ?? [];
    rows.push(...items);
    if (items.length < PAGE_SIZE) break;
  }
  return rows;
}

export function formatCtr(ctr: number | null): string {
  return ctr == null ? '—' : `${(ctr * 100).toFixed(2)}%`;
}

type Filters = { slot?: string; page?: string; creativeId?: string };

function rowsFor(rows: AdStatRow[], f: Filters, ignore: keyof Filters): AdStatRow[] {
  return rows.filter(
    (r) =>
      (ignore === 'slot' || !f.slot || r.slot_slug === f.slot) &&
      (ignore === 'page' || !f.page || r.page === f.page) &&
      (ignore === 'creativeId' || !f.creativeId || r.creative_id === f.creativeId)
  );
}

type TableProps = {
  title: string;
  head: string;
  rows: Array<{ key: string; label: string; impressions: number; clicks: number; ctr: number | null }>;
  active?: string;
  filterLabel: string;
  onPick: (key: string | undefined) => void;
};

function StatsTable({ title, head, rows, active, filterLabel, onPick }: TableProps) {
  return (
    <section className="rounded-[var(--ui-radius-card,1rem)] border border-border bg-card">
      <h3 className="border-b border-border px-4 py-2 text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">Sem linhas para o filtro atual.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium">{head}</th>
                <th className="px-2 py-2 text-right font-medium">Impressões</th>
                <th className="px-2 py-2 text-right font-medium">Cliques</th>
                <th className="px-4 py-2 text-right font-medium">CTR</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className={cn('border-t border-border', active === row.key && 'bg-muted/60')}>
                  <td className="max-w-[16rem] px-4 py-2">
                    <button
                      type="button"
                      aria-label={`${filterLabel} ${row.key}`}
                      aria-pressed={active === row.key}
                      onClick={() => onPick(active === row.key ? undefined : row.key)}
                      className="block max-w-full truncate text-left font-medium hover:underline"
                    >
                      {row.label}
                    </button>
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{row.impressions}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{row.clicks}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatCtr(row.ctr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function AdsMetricsTab() {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<AdStatRow[]>([]);
  const [creatives, setCreatives] = useState<AdCreative[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<Filters>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [stats, cres] = await Promise.all([
        fetchAdStats(rangeFrom(days)),
        fetch('/api/resources/ad_creatives?pageSize=200', { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : { items: [] }))
          .then((b: { items?: AdCreative[] }) => b.items ?? [])
          .catch(() => [] as AdCreative[]),
      ]);
      setRows(stats);
      setCreatives(cres);
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as métricas.');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  const labelOf = useCallback(
    (id: string) => {
      if (id === GOOGLE_CREATIVE_ID) return 'Google (só impressões)';
      const c = creatives.find((x) => x.id === id);
      return c?.label || c?.alt || id.slice(0, 8);
    },
    [creatives]
  );

  const view = useMemo(() => {
    const total = summarize(rows, filters);
    const own = summarizeOwn(rows, filters);
    const from = rangeFrom(days);
    const to = new Date().toISOString().slice(0, 10);
    return {
      total,
      own,
      slots: groupStats(rowsFor(rows, filters, 'slot'), 'slot_slug').map((r) => ({ ...r, label: r.key })),
      creatives: groupStats(rowsFor(rows, filters, 'creativeId'), 'creative_id').map((r) => ({
        ...r,
        label: labelOf(r.key),
      })),
      pages: groupStats(rowsFor(rows, filters, 'page'), 'page').map((r) => ({ ...r, label: r.key })),
      series: dailySeries(
        rows.filter(
          (r) =>
            (!filters.slot || r.slot_slug === filters.slot) &&
            (!filters.page || r.page === filters.page) &&
            (!filters.creativeId || r.creative_id === filters.creativeId)
        ),
        from,
        to
      ),
      // série e totais seguem todos os filtros; cada tabela ignora o próprio filtro.
    };
  }, [rows, filters, days, labelOf]);

  const hasFilter = Boolean(filters.slot || filters.page || filters.creativeId);
  const maxImp = Math.max(1, ...view.series.map((d) => d.impressions));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Período</span>
          <select
            aria-label="Período"
            value={days}
            onChange={(e) => {
              setDays(Number(e.target.value));
              setFilters({});
            }}
            className="h-8 rounded-[var(--ui-radius-pill,0.375rem)] border border-input bg-background px-3 text-sm"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
        </label>
        {hasFilter && (
          <Button size="sm" variant="ghost" onClick={() => setFilters({})}>
            <X className="mr-1 h-4 w-4" /> Limpar filtros
          </Button>
        )}
        <span className="ml-auto flex items-center gap-1 text-sm text-muted-foreground">
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {loading ? 'Carregando…' : `${view.total.impressions} impressões · ${view.total.clicks} cliques · CTR (criativos próprios) ${formatCtr(view.own.ctr)}`}
        </span>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && rows.length === 0 ? (
        <EmptyStateCard
          icon={BarChart3}
          title="Sem dados no período"
          description="Quando os anúncios forem exibidos, impressões e cliques aparecem aqui."
        />
      ) : (
        !error && (
          <>
            <section className="rounded-[var(--ui-radius-card,1rem)] border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">Impressões por dia</h3>
              <div aria-label="Série diária" role="group" className="flex h-24 items-end gap-px">
                {view.series.map((d) => (
                  <div
                    key={d.day}
                    title={`${d.day}: ${d.impressions} impressões, ${d.clicks} cliques`}
                    className="min-w-px flex-1 rounded-t bg-primary/70"
                    style={{ height: `${Math.max(2, (d.impressions / maxImp) * 100)}%` }}
                  />
                ))}
              </div>
            </section>
            <div className="grid gap-4 lg:grid-cols-3">
              <StatsTable
                title="Por slot"
                head="Slot"
                rows={view.slots}
                active={filters.slot}
                filterLabel="Filtrar slot"
                onPick={(slot) => setFilters((f) => ({ ...f, slot }))}
              />
              <StatsTable
                title="Por criativo"
                head="Criativo"
                rows={view.creatives}
                active={filters.creativeId}
                filterLabel="Filtrar criativo"
                onPick={(creativeId) => setFilters((f) => ({ ...f, creativeId }))}
              />
              <StatsTable
                title="Por página"
                head="Página"
                rows={view.pages}
                active={filters.page}
                filterLabel="Filtrar página"
                onPick={(page) => setFilters((f) => ({ ...f, page }))}
              />
            </div>
          </>
        )
      )}
    </div>
  );
}
