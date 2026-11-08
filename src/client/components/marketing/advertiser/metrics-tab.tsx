'use client';
import { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { AD_SLOT_CATALOG } from '../../../../shared/ads';
import { addDays, dbToday, formatBRL, periodDays } from '../../../../shared/marketing/cost';
import { EmptyStateCard } from '../../ui-better-soft/lists/empty-state-card';
import { fetchAll, fetchPage } from './data';
import {
  baselineWindow,
  costPerView,
  ctr,
  denseSeries,
  lift,
  servedDays,
  spentSoFar,
  sum,
  type DailyPoint,
  type DeliveryPoint,
} from './metrics-math';
import type { BoostRow, CampaignRow, OwnService } from './types';
import { useLoad } from './use-load';
import { DailyBars, Field, formatDay, formatInt, LoadError, Loading, Notice, SectionTitle, selectClass, Stat } from './ui';

type EventRow = { day: string; event_type: string };

/** Último dia com dado possível: fim, dia anterior à parada ou hoje — o que vier primeiro. */
function lastDay(p: { endsOn: string; stoppedOn: string | null }, today: string): string {
  const stop = p.stoppedOn ? addDays(p.stoppedOn, -1) : p.endsOn;
  return [p.endsOn, stop, today].sort()[0];
}

function BoostMetrics({ tenantId }: { tenantId: string }) {
  const boosts = useLoad(async () => (await fetchPage<BoostRow>('boosts', { pageSize: 50 })).items, []);
  const services = useLoad(
    async () => (await fetchPage<OwnService>('services', { pageSize: 100, filters: { tenant_id: tenantId } })).items,
    [tenantId],
  );
  const [pick, setPick] = useState('');
  const boost = boosts.data?.find((b) => b.id === pick) ?? boosts.data?.[0] ?? null;
  const title = (uid: string) => services.data?.find((s) => s.uid === uid)?.title ?? 'Anúncio';

  const metrics = useLoad(
    async () => {
      if (!boost) return null;
      const period = { startsOn: boost.startsOn, endsOn: boost.endsOn, stoppedOn: boost.stoppedOn };
      const days = servedDays(period);
      const rows = (await fetchAll<DailyPoint>('vw_boost_metrics_daily', { boost_id: boost.id })).items;
      let before: { views: number; impressions: number } | null = null;
      if (days > 0) {
        const w = baselineWindow(boost.startsOn, days);
        const [v, i] = await Promise.all([
          fetchAll<EventRow>('analytics_events', { entity_id: boost.serviceUid, event_type: 'view' }, 5000),
          fetchAll<EventRow>('analytics_events', { entity_id: boost.serviceUid, event_type: 'impression' }, 5000),
        ]);
        if (!v.truncated && !i.truncated) {
          const inWin = (r: EventRow) => r.day >= w.from && r.day <= w.to;
          before = { views: v.items.filter(inWin).length, impressions: i.items.filter(inWin).length };
        }
      }
      return { rows, before, days, period };
    },
    [boost?.id],
  );

  if (boosts.loading && !boosts.data) return <Loading />;
  if (boosts.error) return <LoadError message={boosts.error} onRetry={boosts.reload} />;
  if (!boost) {
    return <EmptyStateCard icon={BarChart3} title="Nenhum impulsionamento para medir" description="Quando você impulsionar um anúncio, as impressões e visualizações aparecem aqui." />;
  }

  const m = metrics.data;
  const today = dbToday();
  const end = lastDay(boost, today);
  const from = boost.startsOn;
  const hasRange = periodDays({ startsOn: from, endsOn: end }) > 0;
  const impressions = m ? sum(m.rows, 'impressions') : 0;
  const views = m ? sum(m.rows, 'views') : 0;
  const contacts = m ? sum(m.rows, 'contactClicks') : 0;
  const interactions = m ? sum(m.rows, 'interactions') : 0;
  const spent = m ? spentSoFar(boost.dailyCents, m.period) : 0;
  const cpv = costPerView(spent, views);

  return (
    <div className="flex flex-col gap-4">
      <Field label="Impulsionamento">
        <select className={selectClass} value={boost.id} onChange={(e) => setPick(e.target.value)}>
          {boosts.data!.map((b) => (
            <option key={b.id} value={b.id}>
              {title(b.serviceUid)} — {formatDay(b.startsOn)} a {formatDay(b.endsOn)}
            </option>
          ))}
        </select>
      </Field>
      {metrics.loading && !m ? <Loading /> : null}
      {metrics.error ? <LoadError message={metrics.error} onRetry={metrics.reload} /> : null}
      {m ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Apareceu na tela" value={formatInt(impressions)} hint="Impressões" />
            <Stat label="Abriram o anúncio" value={formatInt(views)} hint="Visualizações do detalhe" />
            <Stat label="Cliques no contato" value={formatInt(contacts)} hint={`${formatInt(interactions)} favoritos e compartilhamentos`} />
            <Stat label="Custo por visualização" value={cpv === null ? '—' : formatBRL(cpv)} hint={`Gasto até hoje: ${formatBRL(spent)}`} />
          </div>
          {m.days > 0 && m.before ? (
            <Comparison before={m.before} views={views} impressions={impressions} days={m.days} />
          ) : m.days > 0 ? (
            <Notice tone="info">Não foi possível comparar com o período anterior: o anúncio tem eventos demais para somar aqui.</Notice>
          ) : (
            <Notice tone="info">O impulsionamento ainda não começou. A comparação com o período anterior aparece a partir do primeiro dia.</Notice>
          )}
          {hasRange ? (
            <div className="grid gap-5 lg:grid-cols-2">
              <DailyBars label="Apareceu na tela" series={denseSeries(m.rows, from, end, (r) => r.impressions)} />
              <DailyBars label="Abriram o anúncio" series={denseSeries(m.rows, from, end, (r) => r.views)} />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function Comparison({ before, views, impressions, days }: { before: { views: number; impressions: number }; views: number; impressions: number; days: number }) {
  const v = lift(before.views, views, days);
  const i = lift(before.impressions, impressions, days);
  const fmt = (pct: number | null) => (pct === null ? 'sem base' : `${pct > 0 ? '+' : ''}${pct}%`);
  return (
    <section className="rounded-[var(--ui-radius-card,1rem)] border bg-card p-4" aria-label="Ganho do impulsionamento">
      <h3 className="text-sm font-semibold">Ganho sobre os {days} dia(s) anteriores ao início</h3>
      <dl className="mt-2 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Visualizações</dt>
          <dd className="tabular-nums">
            {formatInt(v.before)} → <strong>{formatInt(v.during)}</strong> <span className="text-muted-foreground">({fmt(v.pct)})</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Apareceu na tela</dt>
          <dd className="tabular-nums">
            {formatInt(i.before)} → <strong>{formatInt(i.during)}</strong> <span className="text-muted-foreground">({fmt(i.pct)})</span>
          </dd>
        </div>
      </dl>
    </section>
  );
}

function CampaignMetrics() {
  const campaigns = useLoad(async () => (await fetchPage<CampaignRow>('ad_campaigns', { pageSize: 50 })).items, []);
  const [pick, setPick] = useState('');
  const c = campaigns.data?.find((k) => k.id === pick) ?? campaigns.data?.[0] ?? null;
  const data = useLoad(
    async () => (c ? (await fetchAll<DeliveryPoint>('vw_ad_delivery_daily', { campaign_id: c.id })).items : null),
    [c?.id],
  );

  const stats = useMemo(() => {
    if (!c || !data.data) return null;
    const period = { startsOn: c.startsOn, endsOn: c.endsOn, stoppedOn: c.stoppedOn };
    const impressions = sum(data.data, 'impressions');
    const clicks = sum(data.data, 'clicks');
    const spent = spentSoFar(c.dailyCents, period);
    return { period, impressions, clicks, spent, served: servedDays(period) };
  }, [c, data.data]);

  if (campaigns.loading && !campaigns.data) return <Loading />;
  if (campaigns.error) return <LoadError message={campaigns.error} onRetry={campaigns.reload} />;
  if (!c) {
    return <EmptyStateCard icon={BarChart3} title="Nenhum banner para medir" description="Depois que um banner for aprovado e entrar no ar, a entrega aparece aqui." />;
  }
  const end = lastDay(c, dbToday());
  const slot = (s: string) => AD_SLOT_CATALOG.find((x) => x.slug === s)?.label ?? s;
  const rate = stats ? ctr(stats.clicks, stats.impressions) : null;

  return (
    <div className="flex flex-col gap-4">
      <Field label="Banner">
        <select className={selectClass} value={c.id} onChange={(e) => setPick(e.target.value)}>
          {campaigns.data!.map((k) => (
            <option key={k.id} value={k.id}>
              {slot(k.slotSlug)} — {formatDay(k.startsOn)} a {formatDay(k.endsOn)}
            </option>
          ))}
        </select>
      </Field>
      {data.loading && !data.data ? <Loading /> : null}
      {data.error ? <LoadError message={data.error} onRetry={data.reload} /> : null}
      {stats && data.data ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Entregas (impressões)" value={formatInt(stats.impressions)} hint="Vezes em que o banner foi visto" />
            <Stat label="Cliques" value={formatInt(stats.clicks)} />
            <Stat label="Taxa de clique" value={rate === null ? '—' : `${rate.toLocaleString('pt-BR')}%`} />
            <Stat
              label="Custo por clique"
              value={stats.clicks > 0 ? formatBRL(Math.round(stats.spent / stats.clicks)) : '—'}
              hint={`Gasto até hoje: ${formatBRL(stats.spent)}`}
            />
          </div>
          {stats.served > 0 && stats.impressions === 0 ? (
            <Notice tone="warn">Nenhuma entrega ainda. O banner só aparece depois de aprovado e dentro do período.</Notice>
          ) : null}
          {periodDays({ startsOn: c.startsOn, endsOn: end }) > 0 ? (
            <div className="grid gap-5 lg:grid-cols-2">
              <DailyBars label="Entregas por dia" series={denseSeries(data.data, c.startsOn, end, (r) => r.impressions)} />
              <DailyBars label="Cliques por dia" series={denseSeries(data.data, c.startsOn, end, (r) => r.clicks)} />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export function MetricsTab({ tenantId }: { tenantId: string }) {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <SectionTitle>Anúncios impulsionados</SectionTitle>
        <BoostMetrics tenantId={tenantId} />
      </section>
      <section>
        <SectionTitle>Banners</SectionTitle>
        <CampaignMetrics />
      </section>
    </div>
  );
}
