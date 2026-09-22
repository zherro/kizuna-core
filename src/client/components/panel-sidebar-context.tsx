'use client';

import { createContext, useContext, useEffect } from 'react';

/**
 * Canal entre uma tela (ex.: o wizard) e o menu lateral do `PanelShellBase`. `request` pede pra
 * encolher o menu no desktop e devolve o `release`, chamado ao sair — o shell restaura o estado
 * anterior, a menos que o usuário tenha mexido no menu enquanto isso (aí vale a escolha dele).
 * Fora de um PanelShell não há provider e o hook não faz nada.
 */
export type PanelSidebarControl = {
  collapseWhileMounted: () => () => void;
};

export const PanelSidebarContext = createContext<PanelSidebarControl | null>(null);

export function useCollapsePanelSidebar(active = true) {
  const control = useContext(PanelSidebarContext);
  useEffect(() => {
    if (!active || !control) return;
    return control.collapseWhileMounted();
  }, [active, control]);
}
