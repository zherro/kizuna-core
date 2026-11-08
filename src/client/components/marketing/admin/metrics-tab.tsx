'use client';

import { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { dbToday, formatBRL } from '../../../../shared/marketing/cost';
import { EmptyStateCard } from '../../ui-better-soft/lists/empty-state-card';
import { LIMITS, loadBoostMetrics, loadBoosts, loadCampaigns, loadDelivery, loadLedger } from './admin-data';
import { buildTenantMetrics, ctr, formatPct, periodFrom } from './admin-math';
import { AccountName, CARD, ErrorNote, Fact, Loading, SELECT_CLASS, Stat, useLoader } from './admin-ui';

const PERIODS = [7, 30, 90] as const;

/**
 * Receita lançada (créditos) × comprometido (impulsionamentos e banners) e entrega, por anunciante,
 * numa janela de dias terminando hoje (dia do banco). Cada abertura refaz as leituras sem cache.
 */
export function MetricsTab() {
  const [days, setDays] = useState<number>(30);
  const today = dbToday();
  const from = periodFrom(days, today);

  const { data, error, loading } = useLoader(async () => {
    const [ledger, boosts, campaigns, boostMetrics, delivery] = await Promise.all([
      loadLedger(from),
      loadBoosts(),
      loadCampaigns(),
      loadBoostMetrics(from),
      loadDelivery(from),
    ]);
    const capped = boosts.length >= LIMITS.boosts || campaigns.length >= LIMITS.campaigns || boostMetrics.length >= LIMITS.metrics || delivery.length >= LIMITS.metrics;
    return { ...buildTenantMetrics({ from, ledger, boosts, campaigns, boostMetrics, delivery }), capped };
  }, 'Não foi possível carregar as métricas.', [days]);

  const t = data?.totals;
  const rows = useMemo(() => data?.rows ?? [], [data]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Período
          <select aria-label="Período" className={SELECT_CLASS} value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {PERIODS.map((d) => (
              <option key={d} value={d}>
                Últimos {d} dias
              </option>
            ))}
          </select>
        </label>
      </div>

      <ErrorNote text={error} />
      {data?.capped ? <ErrorNote text="Dados truncados pelo limite do painel: os totais podem estar subestimados." /> : null}

      {loading && !data ? (
        <Loading text="Carregando métricas…" />
      ) : t ? (
        <>
          {loading ? <Loading text="Atualizando…" /> : null}
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Receita lançada" value={formatBRL(t.creditsCents)} hint="créditos no período" />
            <Stat label="Comprometido" value={formatBRL(t.committedCents)} hint="impulsionamentos e banners ativos no período" />
            <Stat label="Impressões dos anúncios" value={t.boostImpressions} />
            <Stat label="Aberturas do detalhe" value={t.boostViews} hint={`taxa de abertura ${formatPct(ctr(t.boostViews, t.boostImpressions))}`} />
            <Stat label="Entregas de banner" value={t.bannerImpressions} />
            <Stat label="Cliques em banner" value={t.bannerClicks} hint={`CTR ${formatPct(ctr(t.bannerClicks, t.bannerImpressions))}`} />
            <Stat label="Cliques de contato" value={t.contactClicks} />
          </dl>

          {rows.length === 0 ? (
            <EmptyStateCard icon={BarChart3} title="Sem movimento no período" description="Nenhum crédito, impulsionamento ou banner nesta janela." />
          ) : (
            <ul className="flex flex-col gap-3">
              {rows.map((r) => (
                <li key={r.tenantId} className={`${CARD} flex flex-col gap-3 p-4`}>
                  <AccountName label={r.label} tenantId={r.tenantId} />
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-5">
                    <Fact label="Créditos" value={formatBRL(r.creditsCents)} />
                    <Fact label="Comprometido" value={formatBRL(r.committedCents)} />
                    <Fact label="Impressões" value={r.boostImpressions} />
                    <Fact label="Aberturas" value={`${r.boostViews} (${formatPct(ctr(r.boostViews, r.boostImpressions))})`} />
                    <Fact label="Contatos" value={r.contactClicks} />
                    <Fact label="Entregas de banner" value={r.bannerImpressions} />
                    <Fact label="Cliques em banner" value={`${r.bannerClicks} (${formatPct(ctr(r.bannerClicks, r.bannerImpressions))})`} />
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}
