'use client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { formatBRL } from '../../../../shared/marketing/cost';
import { BannersTab } from './banners-tab';
import { BoostsTab } from './boosts-tab';
import { MetricsTab } from './metrics-tab';
import { EMPTY_BALANCE } from './types';
import { useBalance } from './use-balance';
import { WalletTab } from './wallet-tab';
import { LoadError } from './ui';

/**
 * Painel do anunciante (`/painel/marketing`): saldo, impulsionar anúncios, banners e métricas.
 * Tudo por consulta direta (RLS por conta), sem cache. A página do projeto só passa o `tenantId`.
 */
export function AdvertiserPanel({ tenantId }: { tenantId: string }) {
  const bal = useBalance(tenantId);
  const balance = bal.data ?? { ...EMPTY_BALANCE, tenantId };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Marketing</h1>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Destaque seus anúncios com o selo BORA INDICA e divulgue banners. Você paga por dia e o que não usar volta para o saldo.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Saldo disponível</p>
          <p className="text-2xl font-semibold tabular-nums" aria-live="polite">
            {bal.loading && !bal.data ? '…' : formatBRL(balance.balanceCents)}
          </p>
        </div>
      </header>
      {bal.error ? <LoadError message={bal.error} onRetry={bal.reload} /> : null}

      <Tabs defaultValue="saldo" className="flex flex-col gap-4">
        <div className="overflow-x-auto">
          <TabsList className="w-max min-w-full justify-start sm:min-w-0">
            <TabsTrigger value="saldo">Saldo</TabsTrigger>
            <TabsTrigger value="impulsionar">Impulsionar</TabsTrigger>
            <TabsTrigger value="banners">Banners</TabsTrigger>
            <TabsTrigger value="metricas">Métricas</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="saldo">
          <WalletTab balance={balance} reloadBalance={bal.reload} />
        </TabsContent>
        <TabsContent value="impulsionar">
          <BoostsTab tenantId={tenantId} balance={balance} reloadBalance={bal.reload} />
        </TabsContent>
        <TabsContent value="banners">
          <BannersTab tenantId={tenantId} balance={balance} reloadBalance={bal.reload} />
        </TabsContent>
        <TabsContent value="metricas">
          <MetricsTab tenantId={tenantId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
