'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Wallet } from 'lucide-react';
import { formatBRL } from '../../../../shared/marketing/cost';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { EmptyStateCard } from '../../ui-better-soft/lists/empty-state-card';
import { fetchAll } from './admin-api';
import { LIMITS, loadBalances, loadBoosts, loadCampaigns } from './admin-data';
import { buildAdvertisers, filterAdvertisers, shortId, type Advertiser } from './admin-math';
import { AccountName, CARD, ErrorNote, Fact, Loading, Stat, useLoader } from './admin-ui';
import { CreditSheet } from './credit-sheet';

type FoundService = { uid: string; title: string; tenantId: string; status: string };
type Target = { tenantId: string; label: string };

/** Acha a conta de quem anuncia pelo título do anúncio — o admin não lê o perfil de ninguém. */
function useServiceSearch(term: string) {
  const [found, setFound] = useState<FoundService[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) {
      setFound([]);
      setError('');
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(() => {
      fetchAll<FoundService>('advertiser_services', { search: q, pageSize: 20, maxPages: 1, orderBy: 'title' })
        .then((rows) => !cancelled && (setFound(rows), setError('')))
        .catch(() => !cancelled && setError('Não foi possível buscar os anúncios.'))
        .finally(() => !cancelled && setSearching(false));
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [term]);
  return { found, searching, error };
}

export function AdvertisersTab() {
  const { data, error, loading, reload } = useLoader(async () => {
    const [balances, boosts, campaigns] = await Promise.all([loadBalances(), loadBoosts(), loadCampaigns()]);
    return { advertisers: buildAdvertisers({ balances, boosts, campaigns }), capped: boosts.length >= LIMITS.boosts || campaigns.length >= LIMITS.campaigns };
  }, 'Não foi possível carregar os anunciantes.');

  const [query, setQuery] = useState('');
  const [adSearch, setAdSearch] = useState('');
  const [target, setTarget] = useState<Target | null>(null);
  const { found, searching, error: searchError } = useServiceSearch(adSearch);

  const advertisers = data?.advertisers ?? [];
  const visible = useMemo(() => filterAdvertisers(advertisers, query), [advertisers, query]);
  const totals = useMemo(
    () =>
      advertisers.reduce(
        (t, a) => ({ balance: t.balance + a.balanceCents, credited: t.credited + a.creditedCents, committed: t.committed + a.committedCents }),
        { balance: 0, credited: 0, committed: 0 },
      ),
    [advertisers],
  );
  const balanceOf = (tenantId: string): number | null => advertisers.find((a) => a.tenantId === tenantId)?.balanceCents ?? null;

  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Contas com movimento" value={advertisers.length} />
        <Stat label="Creditado" value={formatBRL(totals.credited)} />
        <Stat label="Comprometido" value={formatBRL(totals.committed)} hint="impulsionamentos e banners" />
        <Stat label="Saldo disponível" value={formatBRL(totals.balance)} tone={totals.balance < 0 ? 'bad' : undefined} />
      </dl>

      <section className={`${CARD} flex flex-col gap-3 p-4`}>
        <div>
          <h3 className="text-sm font-semibold">Adicionar saldo a uma conta nova</h3>
          <p className="text-xs text-muted-foreground">
            Contas sem movimento ainda não aparecem na lista. Busque o título de um anúncio dela e lance o saldo.
          </p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            aria-label="Buscar anúncio pelo título"
            className="pl-9"
            placeholder="Título do anúncio"
            value={adSearch}
            onChange={(e) => setAdSearch(e.target.value)}
          />
        </div>
        <ErrorNote text={searchError} />
        {searching ? <Loading text="Buscando…" /> : null}
        {!searching && adSearch.trim().length >= 2 && found.length === 0 && !searchError ? (
          <p className="text-sm text-muted-foreground">Nenhum anúncio encontrado com esse título.</p>
        ) : null}
        {found.length > 0 ? (
          <ul className="flex flex-col divide-y divide-border">
            {found.map((s) => (
              <li key={s.uid} className="flex flex-wrap items-center gap-3 py-2">
                <AccountName label={s.title} tenantId={s.tenantId} />
                <Button size="sm" variant="outline" className="ml-auto" onClick={() => setTarget({ tenantId: s.tenantId, label: s.title })}>
                  <Wallet className="mr-1.5 h-4 w-4" aria-hidden="true" /> Adicionar saldo
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Input
          aria-label="Filtrar anunciantes"
          className="pl-9"
          placeholder="Filtrar por título de anúncio ou id da conta"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <ErrorNote text={error} />
      {data?.capped ? <ErrorNote text="Lista truncada: há mais impulsionamentos ou campanhas do que o painel carrega. Os gastos podem estar subestimados." /> : null}

      {loading && !data ? (
        <Loading text="Carregando anunciantes…" />
      ) : visible.length === 0 && !error ? (
        <EmptyStateCard
          icon={Wallet}
          title={advertisers.length === 0 ? 'Nenhum anunciante ainda' : 'Nenhum resultado'}
          description={
            advertisers.length === 0
              ? 'Quando alguém receber saldo ou impulsionar um anúncio, a conta aparece aqui.'
              : 'Ajuste o filtro para ver outras contas.'
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((a) => (
            <AdvertiserRow key={a.tenantId} advertiser={a} onCredit={() => setTarget({ tenantId: a.tenantId, label: a.label ?? `Conta ${shortId(a.tenantId)}` })} />
          ))}
        </ul>
      )}

      {target ? (
        <CreditSheet
          open
          onOpenChange={(o) => !o && setTarget(null)}
          tenantId={target.tenantId}
          accountLabel={target.label}
          balanceCents={balanceOf(target.tenantId)}
          onDone={() => void reload()}
        />
      ) : null}
    </div>
  );
}

function AdvertiserRow({ advertiser: a, onCredit }: { advertiser: Advertiser; onCredit: () => void }) {
  return (
    <li className={`${CARD} flex flex-col gap-3 p-4`}>
      <div className="flex flex-wrap items-center gap-3">
        <AccountName label={a.label} tenantId={a.tenantId} />
        <Button size="sm" variant="outline" className="ml-auto" onClick={onCredit}>
          <Wallet className="mr-1.5 h-4 w-4" aria-hidden="true" /> Adicionar saldo
        </Button>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-6">
        <Fact label="Saldo" value={<span className={a.balanceCents < 0 ? 'text-red-700 dark:text-red-400' : ''}>{formatBRL(a.balanceCents)}</span>} />
        <Fact label="Creditado" value={formatBRL(a.creditedCents)} />
        <Fact label="Comprometido" value={formatBRL(a.committedCents)} />
        <Fact label="Gasto até hoje" value={formatBRL(a.spentCents)} />
        <Fact label="Impulsionamentos no ar" value={a.activeBoosts} />
        <Fact label="Banners no ar" value={a.activeCampaigns} />
      </dl>
    </li>
  );
}
