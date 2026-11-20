'use client';

import { useEffect, useState } from 'react';
import type { PeriodDays } from '../../../shared/analytics/aggregate';
import { DEVICE_LABELS } from '../../../shared/analytics/metrics';
import { citySlugLabel, utmSourceLabel, type SiteShare, type SiteVisitors } from '../../../shared/analytics/site';
import { fetchSiteVisitors } from '../../analytics/site-visitors-api';
import { BreakdownCard, ShareList } from './breakdown-card';

const TOP = 10;
const UNIT = ['visitante', 'visitantes'] as const;
const int = (n: number) => n.toLocaleString('pt-BR');

type State = { data: SiteVisitors | null; loading: boolean; error: boolean };

function useSiteVisitors(days: PeriodDays): State {
  const [state, setState] = useState<State>({ data: null, loading: true, error: false });
  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: false }));
    fetchSiteVisitors(days, controller.signal)
      .then((data) => setState({ data, loading: false, error: false }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ data: null, loading: false, error: true });
      });
    return () => controller.abort();
  }, [days]);
  return state;
}

function List({ items, label, labelOf }: { items: SiteShare[]; label: string; labelOf: (key: string) => string }) {
  const top = items.slice(0, TOP);
  const rest = items.length - top.length;
  return (
    <>
      <ShareList
        label={label}
        unit={UNIT}
        items={top.map((s) => ({ key: s.key || '_none', label: labelOf(s.key), views: s.visitors, share: s.share }))}
      />
      {rest > 0 ? (
        <p className="px-4 pb-4 text-xs text-muted-foreground md:px-6 md:pb-6">E mais {rest} com menos visitantes.</p>
      ) : null}
    </>
  );
}

/**
 * Visitas do SITE inteiro (todas as páginas, não só anúncios): visitantes-dia por origem de
 * campanha (utm_source; sem UTM = "Direto"), cidade do portal e aparelho. Só para root/`analytics/site`.
 */
export function SiteVisitorsSection({ days }: { days: PeriodDays }) {
  const { data, loading, error } = useSiteVisitors(days);
  const status = error ? 'Não foi possível carregar as visitas do site.' : loading && !data ? 'Carregando…' : null;
  const empty = data?.empty ? 'Nenhuma visita registrada neste período.' : null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-semibold">Visitas do site</h2>
        {data && !data.empty ? (
          <p className="text-xs text-muted-foreground">
            {int(data.visitors)} visitantes-dia · {int(data.pages)} páginas vistas
          </p>
        ) : null}
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        Todas as páginas do portal, menos o painel. A mesma pessoa em dias diferentes conta mais de uma vez.
      </p>
      <BreakdownCard
        title="Visitantes por origem"
        hint="De onde veio a visita, pelo utm_source do link (ex.: ?utm_source=instagram). Sem UTM = Direto."
        empty={status ?? empty}
      >
        {data ? <List items={data.bySource} label="Visitantes por origem" labelOf={utmSourceLabel} /> : null}
      </BreakdownCard>
      {data && !data.empty && data.byCampaign.some((c) => c.key) ? (
        <BreakdownCard title="Visitantes por campanha" hint="utm_campaign do link; sem campanha = Sem campanha.">
          <List
            items={data.byCampaign}
            label="Visitantes por campanha"
            labelOf={(k) => k || 'Sem campanha'}
          />
        </BreakdownCard>
      ) : null}
      {data && !data.empty ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <BreakdownCard title="Visitantes por cidade" hint="Cidade do portal que a pessoa estava vendo.">
            <List items={data.byCity} label="Visitantes por cidade" labelOf={citySlugLabel} />
          </BreakdownCard>
          <BreakdownCard title="Visitantes por aparelho">
            <List
              items={data.byDevice}
              label="Visitantes por aparelho"
              labelOf={(k) => DEVICE_LABELS[k || 'unknown'] ?? k}
            />
          </BreakdownCard>
        </div>
      ) : null}
    </section>
  );
}
