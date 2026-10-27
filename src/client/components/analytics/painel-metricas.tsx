'use client';

import { useState } from 'react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3 } from 'lucide-react';
import { useOwnerStats } from '../../analytics';
import { cn } from '../../../lib/utils';
import type { OwnerStats } from '../../../shared/analytics';
import {
  METRIC_GROUPS,
  METRICS,
  PERIODS,
  SOURCE_LABELS,
  formatMetric,
  type MetricGroup,
  type PeriodDays,
} from '../../../shared/analytics/metrics';
import { DeviceBreakdown } from './device-breakdown';
import { IpBreakdown } from './ip-breakdown';
import { RegionBreakdown } from './region-breakdown';

const CHART_W = 640;
const CHART_H = 120;

function linePath(values: number[], max: number): string {
  const step = values.length > 1 ? CHART_W / (values.length - 1) : 0;
  return values
    .map(
      (v, i) =>
        `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(CHART_H - (v / max) * (CHART_H - 8) - 4).toFixed(1)}`,
    )
    .join(' ');
}

/** Uma série com escala própria (eixo máximo explícito): sem normalização enganosa entre séries. */
function MiniChart({
  label,
  values,
  stroke,
  fill,
}: {
  label: string;
  values: number[];
  stroke: string;
  fill?: string;
}) {
  const peak = Math.max(0, ...values);
  const max = Math.max(1, peak);
  const total = values.reduce((s, n) => s + n, 0);
  return (
    <figure>
      <figcaption className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          total {total.toLocaleString('pt-BR')} · pico diário {peak.toLocaleString('pt-BR')}
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${label} por dia; pico de ${peak} em um dia`}
        className="h-28 w-full"
      >
        <line x1={0} x2={CHART_W} y1={CHART_H - 4} y2={CHART_H - 4} className="stroke-border" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {fill ? <path d={`${linePath(values, max)} L${CHART_W},${CHART_H} L0,${CHART_H} Z`} className={fill} /> : null}
        <path d={linePath(values, max)} fill="none" strokeWidth={2} vectorEffect="non-scaling-stroke" className={stroke} />
      </svg>
    </figure>
  );
}

function SeriesCharts({ series }: { series: OwnerStats['series'] }) {
  const first = series[0]?.day;
  return (
    <div className="flex flex-col gap-5">
      <MiniChart label="Visualizações" values={series.map((p) => p.views)} stroke="stroke-primary" fill="fill-primary/10" />
      <MiniChart label="Cliques no contato" values={series.map((p) => p.contacts)} stroke="stroke-amber-500" />
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>
          {first
            ? new Date(`${first}T00:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })
            : ''}
        </span>
        <span>Hoje</span>
      </div>
    </div>
  );
}

const pct = (v: number | null) => (v === null ? '—' : formatMetric('percent', v));
const int = (n: number) => n.toLocaleString('pt-BR');

type Row = {
  key: string;
  label: string;
  impressions: number;
  views: number;
  contacts: number;
  ctr: number | null;
  contactRate: number | null;
  favorites?: number;
  highlight?: boolean;
};

function BreakdownTable({ title, hint, rows, firstCol }: { title: string; hint?: string; rows: Row[]; firstCol: string }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="px-4 pt-4 md:px-6 md:pt-6">
        <h2 className="text-sm font-semibold">{title}</h2>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-4 py-2 font-medium md:px-6">{firstCol}</th>
              <th className="px-2 py-2 text-right font-medium">Impr.</th>
              <th className="px-2 py-2 text-right font-medium">Views</th>
              <th className="px-2 py-2 text-right font-medium">CTR</th>
              <th className="px-2 py-2 text-right font-medium">Contatos</th>
              <th className="px-4 py-2 text-right font-medium md:px-6">Taxa</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className={cn('border-b border-border last:border-0', r.highlight && 'bg-primary/5')}>
                <td title={r.label} className="max-w-[220px] truncate px-4 py-2.5 font-medium md:px-6">{r.label}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{int(r.impressions)}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{int(r.views)}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{pct(r.ctr)}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{int(r.contacts)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums md:px-6">{pct(r.contactRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function PainelMetricas({ tenantId }: { tenantId: string }) {
  const [days, setDays] = useState<PeriodDays>(30);
  const { stats, loading, error } = useOwnerStats(days, { tenantId });
  const values = stats?.metrics ?? {};

  const groups = (Object.keys(METRIC_GROUPS) as MetricGroup[])
    .map((group) => ({ group, metrics: METRICS.filter((m) => m.group === group) }))
    .filter((g) => g.metrics.length > 0);

  const sourceRows: Row[] = (stats?.bySource ?? []).map((s) => ({
    key: s.source,
    label: SOURCE_LABELS[s.source] ?? s.source,
    impressions: s.impressions,
    views: s.views,
    contacts: s.contacts,
    ctr: s.ctr,
    contactRate: s.contactRate,
    highlight: s.source === 'home' || s.source === 'category',
  }));
  const categoryRows: Row[] = (stats?.byCategory ?? []).map((c) => ({
    key: c.categoryKey,
    label: c.label,
    impressions: c.impressions,
    views: c.views,
    contacts: c.contacts,
    ctr: c.ctr,
    contactRate: c.contactRate,
  }));

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-8 px-4 py-8 md:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Métricas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Como seus anúncios estão performando.</p>
        </div>
        <div role="group" aria-label="Período" className="inline-flex rounded-xl border border-border bg-card p-1">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              type="button"
              aria-pressed={p.days === days}
              onClick={() => setDays(p.days)}
              className={cn(
                'min-h-10 rounded-lg px-4 py-2 text-xs font-medium transition-colors md:min-h-0 md:px-3 md:py-1.5',
                p.days === days ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      {stats?.truncated ? (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p>
            Há muitos eventos neste período e a leitura foi limitada: os números mais antigos podem estar
            abaixo do real. Escolha um período menor para ver tudo.
          </p>
        </div>
      ) : null}

      {stats?.empty ? (
        <section className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <BarChart3 className="h-8 w-8 text-muted-foreground" />
          <h2 className="text-base font-semibold">Ainda não há dados neste período</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            As métricas aparecem quando outras pessoas visualizam seus anúncios. Visitas suas aos próprios
            anúncios não são contadas. Compartilhe o link de um anúncio para começar.
          </p>
        </section>
      ) : null}

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm md:p-6">
        <h2 className="mb-4 text-sm font-semibold">Evolução diária</h2>
        {stats ? (
          <SeriesCharts series={stats.series} />
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {error ? 'Não foi possível carregar as métricas.' : loading ? 'Carregando…' : ''}
          </p>
        )}
      </section>

      {groups.map(({ group, metrics }) => (
        <section key={group} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">{METRIC_GROUPS[group]}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              const { value, delta } = values[metric.id] ?? { value: null, delta: 0 };
              const Trend = delta < 0 ? ArrowDownRight : ArrowUpRight;
              return (
                <article key={metric.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="rounded-lg bg-primary/10 p-2 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    {delta !== 0 ? (
                      <span className={cn('inline-flex items-center text-xs font-medium', delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
                        <Trend className="h-3.5 w-3.5" />
                        {Math.abs(delta)}%
                      </span>
                    ) : null}
                  </div>
                  <div>
                    <p className={cn('font-semibold tracking-tight', value === null && metric.id === 'rating' ? 'text-base leading-8' : 'text-2xl')}>
                      {value === null
                        ? metric.id === 'rating'
                          ? 'Sem avaliações'
                          : '—'
                        : formatMetric(metric.format, value)}
                    </p>
                    <p className="text-sm">{metric.label}</p>
                    {metric.id === 'rating' && stats && stats.ratingCount > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {stats.ratingCount} {stats.ratingCount === 1 ? 'avaliação' : 'avaliações'}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">{metric.hint}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      {stats && !stats.empty ? (
        <>
          <BreakdownTable
            title="Por origem"
            hint="De onde vieram os cliques: página inicial e categorias aparecem em destaque."
            firstCol="Origem"
            rows={sourceRows}
          />
          <div className="grid gap-8 lg:grid-cols-2">
            <DeviceBreakdown items={stats.byDevice ?? []} />
            <RegionBreakdown items={stats.byRegion ?? []} />
          </div>
          <IpBreakdown items={stats.byIp ?? []} />
          <BreakdownTable title="Por categoria" firstCol="Categoria" rows={categoryRows} />

          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <h2 className="px-4 pt-4 text-sm font-semibold md:px-6 md:pt-6">Desempenho por anúncio</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 font-medium md:px-6">Anúncio</th>
                    <th className="px-2 py-2 text-right font-medium">Impr.</th>
                    <th className="px-2 py-2 text-right font-medium">Views</th>
                    <th className="px-2 py-2 text-right font-medium">CTR</th>
                    <th className="px-2 py-2 text-right font-medium">Fav.</th>
                    <th className="px-2 py-2 text-right font-medium">Contatos</th>
                    <th className="px-2 py-2 text-right font-medium">Taxa</th>
                    <th className="px-4 py-2 text-right font-medium md:px-6">Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.entities.map((ad) => (
                    <tr key={ad.entityId} className="border-b border-border last:border-0">
                      <td title={ad.title ?? 'Anúncio'} className="max-w-[260px] truncate px-4 py-2.5 font-medium md:px-6">{ad.title ?? 'Anúncio'}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{int(ad.impressions)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{int(ad.views)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">
                        {pct(ad.impressions > 0 ? Math.min(100, (ad.views / ad.impressions) * 100) : null)}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{int(ad.favorites)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{int(ad.contacts)}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">
                        {pct(ad.views > 0 ? Math.min(100, (ad.contacts / ad.views) * 100) : null)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums md:px-6">
                        {ad.rating == null ? '—' : formatMetric('rating', ad.rating)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
