'use client';
import { useMemo, useState } from 'react';
import { Loader2, Rocket } from 'lucide-react';
import { costCents, formatBRL, situation } from '../../../../shared/marketing/cost';
import { Button } from '../../ui/button';
import { EmptyStateCard } from '../../ui-better-soft/lists/empty-state-card';
import { createItem, fetchPage } from './data';
import { spentSoFar } from './metrics-math';
import { PeriodFields, StopButton } from './period-fields';
import { defaultDraft, evaluatePeriod, type PeriodDraft } from './period-form';
import type { Balance, BoostRow, OwnService } from './types';
import { useLoad } from './use-load';
import { Field, formatDay, LoadError, Loading, Notice, Pager, SectionTitle, selectClass, SituationBadge } from './ui';

function NewBoost({
  tenantId,
  balance,
  services,
  onCreated,
}: {
  tenantId: string;
  balance: Balance;
  services: OwnService[];
  onCreated: () => void;
}) {
  const [serviceUid, setServiceUid] = useState('');
  const [draft, setDraft] = useState<PeriodDraft>(() => defaultDraft());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const evaluation = useMemo(() => evaluatePeriod(draft, balance.balanceCents), [draft, balance.balanceCents]);
  const canSubmit = !!serviceUid && evaluation.check.ok && !busy;
  void tenantId;

  async function submit() {
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      await createItem('boosts', {
        serviceUid,
        dailyCents: evaluation.dailyCents,
        startsOn: draft.startsOn,
        endsOn: draft.endsOn,
      });
      setDone(true);
      setServiceUid('');
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível impulsionar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[var(--ui-radius-card,1rem)] border bg-card p-4" aria-labelledby="new-boost">
      <h2 id="new-boost" className="text-base font-semibold">
        Impulsionar um anúncio
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        O anúncio ganha o selo BORA INDICA e entra na faixa de patrocinados, em todas as páginas, assim que começar.
      </p>
      <div className="mt-4 flex flex-col gap-4">
        <Field label="Anúncio" hint={services.length === 0 ? 'Você não tem anúncios publicados para impulsionar.' : 'Só aparecem anúncios publicados.'}>
          <select className={selectClass} value={serviceUid} onChange={(e) => setServiceUid(e.target.value)} disabled={services.length === 0}>
            <option value="">Escolha um anúncio</option>
            {services.map((s) => (
              <option key={s.uid} value={s.uid}>
                {s.title}
              </option>
            ))}
          </select>
        </Field>
        <PeriodFields draft={draft} onChange={setDraft} evaluation={evaluation} balanceCents={balance.balanceCents} />
        {error ? <Notice tone="error">{error}</Notice> : null}
        {done ? <Notice tone="ok">Impulsionamento criado. Ele aparece na lista abaixo.</Notice> : null}
        <div>
          <Button type="button" onClick={submit} disabled={!canSubmit}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Impulsionar por {formatBRL(evaluation.totalCents)}
          </Button>
        </div>
      </div>
    </section>
  );
}

function BoostList({ services, refreshKey, onChanged }: { services: OwnService[]; refreshKey: number; onChanged: () => void }) {
  const [page, setPage] = useState(1);
  const l = useLoad(() => fetchPage<BoostRow>('boosts', { page, pageSize: 8 }), [page, refreshKey]);
  const titleByUid = useMemo(() => new Map(services.map((s) => [s.uid, s.title])), [services]);

  return (
    <section>
      <SectionTitle>Meus impulsionamentos</SectionTitle>
      {l.loading && !l.data ? <Loading /> : null}
      {l.error ? <LoadError message={l.error} onRetry={l.reload} /> : null}
      {l.data && l.data.items.length === 0 ? (
        <EmptyStateCard icon={Rocket} title="Nenhum impulsionamento ainda" description="Escolha um anúncio acima, defina a diária e o período e ele passa a aparecer com o selo BORA INDICA." />
      ) : null}
      {l.data && l.data.items.length > 0 ? (
        <>
          <ul className="flex flex-col gap-3">
            {l.data.items.map((b) => {
              const period = { startsOn: b.startsOn, endsOn: b.endsOn, stoppedOn: b.stoppedOn };
              const sit = situation(period);
              return (
                <li key={b.id} className="rounded-[var(--ui-radius-card,1rem)] border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 break-words font-medium">{titleByUid.get(b.serviceUid) ?? 'Anúncio'}</p>
                    <SituationBadge situation={sit} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                    <div>
                      <dt className="text-xs text-muted-foreground">Período</dt>
                      <dd>
                        {formatDay(b.startsOn)} a {formatDay(b.endsOn)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Diária</dt>
                      <dd className="tabular-nums">{formatBRL(b.dailyCents)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Gasto até hoje</dt>
                      <dd className="tabular-nums">{formatBRL(spentSoFar(b.dailyCents, period))}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Reservado no total</dt>
                      <dd className="tabular-nums">{formatBRL(costCents(b.dailyCents, period))}</dd>
                    </div>
                  </dl>
                  {b.stoppedOn ? <p className="mt-2 text-xs text-muted-foreground">Parado em {formatDay(b.stoppedOn)}.</p> : null}
                  <div className="mt-3">
                    <StopButton resource="boosts" id={b.id} dailyCents={b.dailyCents} period={period} onStopped={onChanged} />
                  </div>
                </li>
              );
            })}
          </ul>
          <Pager page={l.data.page} totalPages={l.data.totalPages} onPage={setPage} />
        </>
      ) : null}
    </section>
  );
}

export function BoostsTab({ tenantId, balance, reloadBalance }: { tenantId: string; balance: Balance; reloadBalance: () => void }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const svc = useLoad(
    async () => {
      const r = await fetchPage<OwnService>('services', { pageSize: 100, filters: { tenant_id: tenantId, status: 'active', active: true } });
      return r.items;
    },
    [tenantId, refreshKey],
  );
  const changed = () => {
    setRefreshKey((k) => k + 1);
    reloadBalance();
  };
  return (
    <div className="flex flex-col gap-6">
      {svc.loading && !svc.data ? <Loading /> : null}
      {svc.error ? <LoadError message={svc.error} onRetry={svc.reload} /> : null}
      {svc.data ? <NewBoost tenantId={tenantId} balance={balance} services={svc.data} onCreated={changed} /> : null}
      <BoostList services={svc.data ?? []} refreshKey={refreshKey} onChanged={changed} />
    </div>
  );
}
