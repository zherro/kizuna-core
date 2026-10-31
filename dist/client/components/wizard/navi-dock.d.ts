import type { WizardConversationView } from './use-wizard-conversation';
/**
 * Dock da Naví: última fala em destaque + a penúltima desfocada + `NaviComposer`. Fica ao pé da
 * coluna de passos e acompanha o scroll (`.wz-navi-dock` = `sticky bottom`). Minimizar recolhe
 * pra pílula (ver `NaviLayer`); "Ver conversa" abre o `NaviPanel`. Renderer puro — o estado vem
 * de `conv` (`useWizardConversation`).
 */
export declare function NaviDock({ conv }: {
    conv: WizardConversationView;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=navi-dock.d.ts.map