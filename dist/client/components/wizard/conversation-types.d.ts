/**
 * Contrato NOVO e aditivo pra Naví conversacional no wizard. Paralelo ao `WizardAssistant`
 * (congelado — ver types.ts). A engine é dona do fio; o adapter é só transporte.
 */
export interface WizardConversationTurn {
    role: 'assistant' | 'user';
    content: string;
}
export interface WizardConversationChoice {
    /** rótulo na tag */
    label: string;
    /** texto enviado ao clicar (default = label) */
    value?: string;
    /** múltipla escolha: acumula marcada, envia junto no "Enviar" */
    multi?: boolean;
    /** a engine ofereceu esta tag pra avançar o passo (ex.: "Pode seguir") — destaque visual */
    advance?: boolean;
}
export interface WizardConverseInput {
    userText: string;
    turns: WizardConversationTurn[];
    state: Record<string, unknown>;
    stepKey: string;
    intent: 'reply' | 'confirm-advance';
}
export interface WizardConverseResult {
    message: string;
    choices: WizardConversationChoice[];
    patch: Record<string, unknown>;
    advance: 'ask' | 'hold';
    needsMore: boolean;
}
/** Transporte puro — sem estado de conversa. A engine mantém o fio. */
export interface WizardConversationAdapter {
    converse(input: WizardConverseInput): Promise<WizardConverseResult>;
    status: 'ready' | 'degraded' | 'unavailable';
    retry?: () => void;
    /** saudação mostrada quando o painel abre sem o fio ter começado */
    greeting: string;
}
//# sourceMappingURL=conversation-types.d.ts.map