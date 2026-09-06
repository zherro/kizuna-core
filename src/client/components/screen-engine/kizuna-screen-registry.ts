import type { ComponentType } from 'react';

/**
 * Uma tela do painel resolvida pela rota catch-all `/painel/[[...kizuna]]`.
 * A chave é o path relativo a `/painel` com os segmentos unidos por `/`
 * (ex.: `agenda`, `taxonomia/arvore`).
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
 * Registro global de telas de painel. Hoje está DORMENTE (vazio `{}`): nenhuma
 * tela de plugin foi promovida ainda. Será populado na Fase A, à medida que as
 * telas de plugin (taxonomia, forms, …) forem promovidas para o core e
 * espalhadas aqui (`{ ...taxonomyScreens, ...formsScreens }`).
 */
export const KIZUNA_SCREEN_REGISTRY: Record<string, KizunaScreenEntry> = {};
