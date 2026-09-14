import type { WizardConversationAdapter, WizardConversationChoice, WizardConversationTurn } from './conversation-types';
import type { WizardStep, WizardStepContext } from './types';
export interface UseWizardConversationOptions<S extends Record<string, unknown>> {
    adapter: WizardConversationAdapter | undefined;
    steps: WizardStep<S>[];
    currentIndex: number;
    ctx: WizardStepContext<S>;
    goContinue: () => Promise<void>;
    submitting: boolean;
    /** current step passes `canContinue` — gates the "Pode seguir" suggestion */
    canContinue: boolean;
    isLastStep: boolean;
}
export interface WizardConversationView {
    active: boolean;
    /** a Naví caiu no meio da conversa (indisponível, mas já tinha turnos) — mostra um aviso suave */
    endedMidway: boolean;
    status: 'ready' | 'degraded' | 'unavailable';
    turns: WizardConversationTurn[];
    choices: WizardConversationChoice[];
    pending: boolean;
    minimized: boolean;
    setMinimized: (v: boolean) => void;
    panelOpen: boolean;
    setPanelOpen: (v: boolean) => void;
    fresh: boolean;
    greeting: string;
    send: (userText: string) => Promise<void>;
    pickChoice: (choice: WizardConversationChoice) => void;
    retry?: () => void;
}
/**
 * Dona do fio da Naví conversacional. Trata UM passo por vez: anexa turnos, chama o adapter,
 * aplica o patch (só campos vazios/intocados). **Nunca avança sozinha** — quando a Naví julga o
 * passo pronto (`advance: 'ask'`) ela só oferece a tag **"Pode seguir"**; o avanço acontece por
 * ela OU pelo botão "Continuar"/"Avançar" do rodapé (habilitado por `canContinue`). Sempre que o
 * passo muda pra frente, a Naví abre a 1ª pergunta do novo (`confirm-advance`).
 */
export declare function useWizardConversation<S extends Record<string, unknown>>(opts: UseWizardConversationOptions<S>): WizardConversationView;
//# sourceMappingURL=use-wizard-conversation.d.ts.map