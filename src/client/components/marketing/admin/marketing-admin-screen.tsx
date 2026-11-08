'use client';

import { PageHeader } from '../../ui-better-soft/headers/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { AdvertisersTab } from './advertisers-tab';
import { BannersTab } from './banners-tab';
import { BoostsTab } from './boosts-tab';
import { MetricsTab } from './metrics-tab';

/**
 * Root screen (`/painel/root/marketing`): anunciantes e saldo, impulsionamentos de qualquer usuário,
 * moderação e campanhas de banner, e métricas/orçamento. Só RLS e consulta direta (sem função SQL);
 * cada aba lê sem cache ao abrir. O gate `is_root` fica em `root-screens/resolver.tsx`.
 */
export function MarketingAdminScreen() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
      <PageHeader
        eyebrow="Root"
        title="Marketing"
        description="Saldo dos anunciantes, impulsionamentos, banners e o retorno que cada conta recebe."
      />
      <Tabs defaultValue="anunciantes">
        <TabsList className="h-auto max-w-full flex-wrap justify-start">
          <TabsTrigger value="anunciantes">Anunciantes</TabsTrigger>
          <TabsTrigger value="impulsionamentos">Impulsionamentos</TabsTrigger>
          <TabsTrigger value="banners">Banners</TabsTrigger>
          <TabsTrigger value="metricas">Métricas</TabsTrigger>
        </TabsList>
        <TabsContent value="anunciantes">
          <AdvertisersTab />
        </TabsContent>
        <TabsContent value="impulsionamentos">
          <BoostsTab />
        </TabsContent>
        <TabsContent value="banners">
          <BannersTab />
        </TabsContent>
        <TabsContent value="metricas">
          <MetricsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
