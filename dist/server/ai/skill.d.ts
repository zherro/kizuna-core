/**
 * Registry de skills de IA (server-side). Uma `AiSkill` empacota tudo que o
 * orquestrador (`runSkill`) precisa: como carregar contexto, montar o prompt,
 * o schema estruturado esperado e como validar/mapear a resposta crua.
 *
 * O `context` agrupa skills para o liga/desliga em `ai_assistant.contexts`
 * (ver `run-skill.ts`).
 */
export interface AiSkillContext {
    userId: string;
    tenantId: string;
}
export interface AiSkill<I = unknown, L = unknown, O = unknown> {
    key: string;
    /** Agrupa skills para o toggle on/off (`ai_assistant.contexts[context]`). */
    context: string;
    loadContext?(input: I, ctx: AiSkillContext): Promise<L>;
    buildPrompt(input: I, loaded: L): {
        systemPrompt: string;
        contents: unknown;
    };
    schema: unknown;
    validate(raw: Record<string, unknown>, loaded: L, input: I): O;
    rateLimit?: {
        max: number;
        windowMs: number;
    };
}
export declare function registerSkill(skill: AiSkill): void;
export declare function getSkill(key: string): AiSkill | undefined;
/** Contextos distintos das skills registradas — usado pela tela de configuração. */
export declare function listSkillContexts(): string[];
//# sourceMappingURL=skill.d.ts.map