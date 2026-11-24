'use client';

import type { MarketingDisplay } from '../../../../shared/marketing/display';
import { PageHeader } from '../../ui-better-soft/headers/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { MarketingDisplayProvider, useMarketingDisplay } from '../display-context';
import { AdvertisersTab } from './advertisers-tab';
import { BannersTab } from './banners-tab';
import { BoostsTab } from './boosts-tab';
import { MetricsTab } from './metrics-tab';

/**
 * Root screen (`/painel/root/marketing`): anunciantes e saldo, impulsionamentos de qualquer usuário,
 * moderação e campanhas de banner, e métricas/orçamento. Só RLS e consulta direta (sem função SQL);
 * cada aba lê sem cache ao abrir. O gate `is_root` fica em `root-screens/resolver.tsx`.
 * `display` (opcional) troca R$ por créditos e/ou esconde banners; sem ele, o padrão de sempre.
 */
export function MarketingAdminScreen({ display }: { display?: MarketingDisplay } = {}) {
  return (
    <MarketingDisplayProvider value={display}>
      <AdminScreen />
    </MarketingDisplayProvider>
  );
}

function AdminScreen() {
  const { banners, unit, title } = useMarketingDisplay();
  const who = unit === 'credits' ? 'Créditos dos anunciantes' : 'Saldo dos anunciantes';
  const description = banners
    ? `${who}, impulsionamentos, banners e o retorno que cada conta recebe.`
    : `${who}, impulsionamentos e o retorno que cada conta recebe.`;
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
      <PageHeader eyebrow="Root" title={title} description={description} />
      <Tabs defaultValue="anunciantes">
        <TabsList className="h-auto max-w-full flex-wrap justify-start">
          <TabsTrigger value="anunciantes">Anunciantes</TabsTrigger>
          <TabsTrigger value="impulsionamentos">Impulsionamentos</TabsTrigger>
          {banners ? <TabsTrigger value="banners">Banners</TabsTrigger> : null}
          <TabsTrigger value="metricas">Métricas</TabsTrigger>
        </TabsList>
        <TabsContent value="anunciantes">
          <AdvertisersTab />
        </TabsContent>
        <TabsContent value="impulsionamentos">
          <BoostsTab />
        </TabsContent>
        {banners ? (
          <TabsContent value="banners">
            <BannersTab />
          </TabsContent>
        ) : null}
        <TabsContent value="metricas">
          <MetricsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
