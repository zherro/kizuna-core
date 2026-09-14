import type { WizardConversationView } from './use-wizard-conversation';
/**
 * A camada persistente da Naví no wizard: fica ao pé da coluna de passos e **acompanha o scroll**
 * (o shell renderiza isto uma vez, no fim do `<main>`). Dock aberto, pílula quando minimizado,
 * ou um aviso curto se a Naví caiu no meio.
 */
export declare function NaviLayer({ conv }: {
    conv: WizardConversationView;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=navi-layer.d.ts.map