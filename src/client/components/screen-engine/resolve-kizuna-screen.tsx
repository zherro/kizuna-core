import type { ComponentType } from 'react';
import { redirect, notFound } from 'next/navigation';
import { getSession } from '../../../server';
import { KIZUNA_SCREEN_REGISTRY } from './kizuna-screen-registry';

type ResolveKizunaScreenOptions = {
  /**
   * Componentes para slugs "slot" (entradas com `component: null`) — o componente
   * do projeto consumidor, keyed pela chave da tela (`segments.join('/')`).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  slotComponents?: Record<string, ComponentType<any>>;
};

/**
 * O único lugar onde o gate de permissão de uma tela de painel de plugin vive.
 * Chamado pelo `page.tsx` fino da rota catch-all `/painel/[[...kizuna]]` com os
 * segmentos da URL. Resolve a chave contra `KIZUNA_SCREEN_REGISTRY`; `notFound()`
 * numa chave desconhecida ou slot sem componente (404 normal do Next, não 500);
 * `redirect('/painel')` se a entrada exige `permResource` e a sessão não tem.
 */
export async function resolveKizunaScreen(
  segments: string[],
  options: ResolveKizunaScreenOptions = {}
) {
  const key = segments.join('/');
  const entry = KIZUNA_SCREEN_REGISTRY[key];
  if (!entry) {
    notFound();
  }

  if (entry.permResource) {
    const session = await getSession();
    const hasPerm =
      !!session &&
      (session.is_root === true || session.perms?.[entry.permResource]?.view === true);
    if (!hasPerm) {
      redirect('/painel');
    }
  }

  const Component = entry.component ?? options.slotComponents?.[key];
  if (!Component) {
    notFound();
  }

  return { Component };
}
