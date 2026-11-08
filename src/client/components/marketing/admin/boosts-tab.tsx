'use client';

import { useMemo, useState } from 'react';
import { Rocket, Search } from 'lucide-react';
import { formatBRL } from '../../../../shared/marketing/cost';
import { Input } from '../../ui/input';
import { EmptyStateCard } from '../../ui-better-soft/lists/empty-state-card';
import { LIMITS, loadBoostMetrics, loadBoosts } from './admin-data';
import {
  committedOf,
  costPerView,
  ctr,
  formatPct,
  situationOf,
  spentOf,
  sumBoostMetrics,
  type BoostRow,
} from './admin-math';
import { AccountName, CARD, ErrorNote, Fact, Loading, SELECT_CLASS, SituationBadge, useLoader } from './admin-ui';
import { StopButton } from './stop-button';

type Filter = 'all' | 'live' | 'scheduled' | 'closed';
const brDate = (iso: string) => iso.split('-').reverse().join('/');

export function BoostsTab() {
  const { data, error, loading, reload } = useLoader(async () => {
    const [boosts, metrics] = await Promise.all([loadBoosts(), loadBoostMetrics()]);
    return { boosts, stats: sumBoostMetrics(metrics), capped: boosts.length >= LIMITS.boosts || metrics.length >= LIMITS.metrics };
  }, 'Não foi possível carregar os impulsionamentos.');

  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.boosts ?? []).filter((b) => {
      const s = situationOf(b);
      if (filter === 'live' && s !== 'live') return false;
      if (filter === 'scheduled' && s !== 'scheduled') return false;
      if (filter === 'closed' && s !== 'stopped' && s !== 'ended') return false;
      return !q || b.title.toLowerCase().includes(q) || b.tenantId.toLowerCase().includes(q);
    });
  }, [data, filter, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            aria-label="Filtrar impulsionamentos"
            className="pl-9"
            placeholder="Título do anúncio ou id da conta"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select aria-label="Situação" className={SELECT_CLASS} value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
          <option value="all">Todos</option>
          <option value="live">No ar</option>
          <option value="scheduled">Agendados</option>
          <option value="closed">Parados e encerrados</option>
        </select>
      </div>

      <ErrorNote text={error} />
      {data?.capped ? <ErrorNote text="Lista truncada: o painel carrega só parte dos registros. Gastos e métricas podem estar subestimados." /> : null}

      {loading && !data ? (
        <Loading text="Carregando impulsionamentos…" />
      ) : rows.length === 0 && !error ? (
        <EmptyStateCard
          icon={Rocket}
          title="Nenhum impulsionamento"
          description={filter === 'all' && !query ? 'Quando um anunciante impulsionar um anúncio, ele aparece aqui.' : 'Nada com esse filtro.'}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((b) => (
            <BoostItem key={b.id} boost={b} stats={data?.stats.get(b.id)} onChanged={() => void reload()} />
          ))}
        </ul>
      )}
    </div>
  );
}

function BoostItem({
  boost: b,
  stats,
  onChanged,
}: {
  boost: BoostRow;
  stats?: { impressions: number; views: number; contactClicks: number };
  onChanged: () => void;
}) {
  const impressions = stats?.impressions ?? 0;
  const views = stats?.views ?? 0;
  const spent = spentOf(b);
  const cpv = costPerView(spent, views);
  return (
    <li className={`${CARD} flex flex-col gap-3 p-4`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{b.title || 'Anúncio sem título visível'}</span>
          <span className="block text-xs text-muted-foreground">
            {brDate(b.startsOn)} a {brDate(b.endsOn)}
            {b.stoppedOn ? ` · parado em ${brDate(b.stoppedOn)}` : ''}
          </span>
        </span>
        <SituationBadge value={situationOf(b)} />
      </div>
      <AccountName label={null} tenantId={b.tenantId} />
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-6">
        <Fact label="Diária" value={formatBRL(b.dailyCents)} />
        <Fact label="Comprometido" value={formatBRL(committedOf(b))} />
        <Fact label="Gasto até hoje" value={formatBRL(spent)} />
        <Fact label="Impressões" value={impressions} />
        <Fact label="Aberturas do detalhe" value={views} />
        <Fact label="Taxa de abertura" value={formatPct(ctr(views, impressions))} />
        <Fact label="Cliques de contato" value={stats?.contactClicks ?? 0} />
        <Fact label="Custo por abertura" value={cpv == null ? '—' : formatBRL(cpv)} />
      </dl>
      <div>
        <StopButton resource="boosts" id={b.id} row={b} noun="impulsionamento" onDone={onChanged} />
      </div>
    </li>
  );
}
