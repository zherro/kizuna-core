'use client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import type { MarketingDisplay } from '../../../../shared/marketing/display';
import { MarketingDisplayProvider, useMarketingDisplay } from '../display-context';
import { BannersTab } from './banners-tab';
import { BoostsTab } from './boosts-tab';
import { MetricsTab } from './metrics-tab';
import { EMPTY_BALANCE } from './types';
import { useBalance } from './use-balance';
import { WalletTab } from './wallet-tab';
import { LoadError } from './ui';

/**
 * Painel do anunciante (`/painel/marketing`): saldo, impulsionar anúncios, banners e métricas.
 * Tudo por consulta direta (RLS por conta), sem cache. A página do projeto só passa o `tenantId`
 * (e, se quiser, `display`: créditos em vez de R$, sem banners, extrato completo).
 */
const TABS = ['saldo', 'impulsionar', 'banners', 'metricas'] as const;

type PanelProps = {
  tenantId: string;
  /** Aba inicial (`?aba=impulsionar`), ex.: vindo de "Impulsionar" em Minhas publicações. */
  initialTab?: string;
  /** Anúncio já escolhido no impulsionamento (`?anuncio=<uid>`). */
  initialServiceUid?: string;
};

export function AdvertiserPanel({ display, ...props }: PanelProps & { display?: MarketingDisplay }) {
  return (
    <MarketingDisplayProvider value={display}>
      <Panel {...props} />
    </MarketingDisplayProvider>
  );
}

function Panel({ tenantId, initialTab, initialServiceUid }: PanelProps) {
  const { money, words, banners, badgeName, title } = useMarketingDisplay();
  const tabs = banners ? TABS : TABS.filter((t) => t !== 'banners');
  const startTab = (tabs as readonly string[]).includes(initialTab ?? '') ? (initialTab as string) : 'saldo';
  const bal = useBalance(tenantId);
  const balance = bal.data ?? { ...EMPTY_BALANCE, tenantId };
  const lead = banners
    ? `Destaque seus anúncios com o selo ${badgeName} e divulgue banners. Você paga por dia e o que não usar volta ${words.toBalance}.`
    : `Destaque seus anúncios com o selo ${badgeName}. Você paga por dia e o que não usar volta ${words.toBalance}.`;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">{lead}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">{words.balanceAvailable}</p>
          <p className="text-2xl font-semibold tabular-nums" aria-live="polite">
            {bal.loading && !bal.data ? '…' : money(balance.balanceCents)}
          </p>
        </div>
      </header>
      {bal.error ? <LoadError message={bal.error} onRetry={bal.reload} /> : null}

      <Tabs defaultValue={startTab} className="flex flex-col gap-4">
        <div className="overflow-x-auto">
          <TabsList className="w-max min-w-full justify-start sm:min-w-0">
            <TabsTrigger value="saldo">{words.balance}</TabsTrigger>
            <TabsTrigger value="impulsionar">Impulsionar</TabsTrigger>
            {banners ? <TabsTrigger value="banners">Banners</TabsTrigger> : null}
            <TabsTrigger value="metricas">Métricas</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="saldo">
          <WalletTab balance={balance} reloadBalance={bal.reload} />
        </TabsContent>
        <TabsContent value="impulsionar">
          <BoostsTab tenantId={tenantId} balance={balance} reloadBalance={bal.reload} initialServiceUid={initialServiceUid} />
        </TabsContent>
        {banners ? (
          <TabsContent value="banners">
            <BannersTab tenantId={tenantId} balance={balance} reloadBalance={bal.reload} />
          </TabsContent>
        ) : null}
        <TabsContent value="metricas">
          <MetricsTab tenantId={tenantId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
