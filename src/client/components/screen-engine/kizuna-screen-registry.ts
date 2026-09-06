import type { ComponentType } from 'react';

/**
 * Uma tela do painel resolvida pela rota catch-all `/painel/[[...kizuna]]`.
 * Plugins registram suas telas mutando `KIZUNA_SCREEN_REGISTRY` (spread dos
 * fragmentos `registry/<plugin>.ts`) — a chave é o path relativo a `/painel`
 * com os segmentos unidos por `/` (ex.: `agenda`, `taxonomia/arvore`).
 */
export type KizunaScreenEntry = {
  title: string;
  kind: 'component';
  /**
   * O componente da tela. `null` = "slot": o projeto consumidor fornece o
   * componente via `options.slotComponents[key]` em `resolveKizunaScreen`.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<any> | null;
  /** Se setado, exige sessão com essa permissão; senão `redirect('/painel')`. */
  permResource?: string;
};

/**
 * Registro global e MUTÁVEL de telas de painel. Começa vazio; cada plugin
 * habilitado adiciona/espalha suas entradas em tempo de import do seu
 * fragmento `registry/<plugin>.ts` (Fase 2, Tasks 13/14).
 */
export const KIZUNA_SCREEN_REGISTRY: Record<string, KizunaScreenEntry> = {};
