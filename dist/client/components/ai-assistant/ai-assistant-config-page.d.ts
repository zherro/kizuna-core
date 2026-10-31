export interface AiAssistantConfigValue {
    provider?: string;
    model?: string;
    contexts?: Record<string, boolean>;
}
export interface AiAssistantConfigPageProps {
    /** Contextos de IA disponíveis (o app passa, ex. `['search', 'service-wizard']`). Um toggle por item. */
    contexts: string[];
    /** Valores atuais lidos de `system_config` pelo app. */
    value?: AiAssistantConfigValue;
    /** Persistência — o app implementa (3 chamadas `submitResource` contra `system_config`). */
    onSave?: (next: {
        provider: string;
        model: string;
        contexts: Record<string, boolean>;
    }) => Promise<void> | void;
    /** De `GET /api/ai/status`. Quando `false`, mostra um aviso de chave ausente. */
    statusConfigured?: boolean;
    /** Desabilita o formulário enquanto o app carrega os valores. */
    loading?: boolean;
}
/**
 * Tela de configuração do plugin `ai_assistant` (provedor + modelo + contextos ligados).
 *
 * O core NÃO lê nem grava `system_config` — recebe os valores atuais por `value` e devolve a
 * edição por `onSave` (decisão do spec §2.3: mantém o core sem depender de um resource específico).
 * O componente só renderiza o formulário, rastreia a edição local e chama `onSave` no submit.
 */
export declare function AiAssistantConfigPage({ contexts, value, onSave, statusConfigured, loading, }: Readonly<AiAssistantConfigPageProps>): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ai-assistant-config-page.d.ts.map