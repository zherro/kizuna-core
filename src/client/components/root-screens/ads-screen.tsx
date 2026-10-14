'use client';

import { AlertTriangle } from 'lucide-react';
import { PageHeader } from '../ui-better-soft/headers/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { AdsCreativesTab } from './ads-creatives-tab';
import { AdsMetricsTab } from './ads-metrics-tab';
import { AdsSlotsTab } from './ads-slots-tab';

/**
 * Root screen (`/painel/root/ads`): slots de publicidade (catálogo), criativos próprios e métricas
 * (impressões/cliques por slot, criativo e página). `adsenseConfigured` vem da page do starter
 * (config `ads.adsenseClient`); quando false, só avisa — os slots seguem funcionando com criativos
 * próprios.
 */
export function AdsScreen({ adsenseConfigured }: { adsenseConfigured?: boolean } = {}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
      <PageHeader
        eyebrow="Root"
        title="Publicidade"
        description="Configure onde os anúncios aparecem, quais criativos próprios rodam em cada slot e acompanhe impressões e cliques."
      />

      {adsenseConfigured === false && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            AdSense não configurado (<code>ads.adsenseClient</code>). Os anúncios do Google não serão exibidos até
            definir o cliente nas configurações.
          </p>
        </div>
      )}

      <Tabs defaultValue="slots">
        <TabsList>
          <TabsTrigger value="slots">Slots</TabsTrigger>
          <TabsTrigger value="criativos">Criativos</TabsTrigger>
          <TabsTrigger value="metricas">Métricas</TabsTrigger>
        </TabsList>
        <TabsContent value="slots">
          <AdsSlotsTab />
        </TabsContent>
        <TabsContent value="criativos">
          <AdsCreativesTab />
        </TabsContent>
        <TabsContent value="metricas">
          <AdsMetricsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
