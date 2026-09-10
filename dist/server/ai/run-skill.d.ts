import { type AiSkillContext } from './skill';
/**
 * Orquestrador: resolve a skill, checa o toggle de contexto e o rate limit,
 * resolve o provedor, carrega contexto, monta o prompt, chama o provedor e
 * devolve a saída já validada pela skill.
 */
export declare function runSkill<I, O>(skillKey: string, input: I, ctx: AiSkillContext): Promise<{
    output: O;
}>;
//# sourceMappingURL=run-skill.d.ts.map