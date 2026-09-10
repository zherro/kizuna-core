import { AiRateLimitedError, AiUnavailableError } from './errors';
import { checkRateLimit } from './rate-limit';
import { readSystemConfig } from './system-config';
import { resolveProvider } from './provider/resolve';
import { getSkill } from './skill';
/**
 * Orquestrador: resolve a skill, checa o toggle de contexto e o rate limit,
 * resolve o provedor, carrega contexto, monta o prompt, chama o provedor e
 * devolve a saída já validada pela skill.
 */
export async function runSkill(skillKey, input, ctx) {
    const skill = getSkill(skillKey);
    if (!skill) {
        throw new AiUnavailableError(`skill "${skillKey}" não registrada.`, { reason: 'blocked' });
    }
    const contexts = await readSystemConfig('ai_assistant.contexts');
    if (contexts?.[skill.context] === false) {
        // Só `=== false` desliga; ausente = ligado.
        throw new AiUnavailableError(`contexto "${skill.context}" desligado.`, { reason: 'blocked' });
    }
    if (skill.rateLimit &&
        !checkRateLimit(`${skillKey}:${ctx.userId}`, skill.rateLimit.max, skill.rateLimit.windowMs)) {
        throw new AiRateLimitedError('rate limit.', {
            retryAfterSec: Math.ceil(skill.rateLimit.windowMs / 1000),
        });
    }
    const provider = await resolveProvider();
    const loaded = (await skill.loadContext?.(input, ctx));
    const { systemPrompt, contents } = skill.buildPrompt(input, loaded);
    const raw = await provider.generateStructured({
        systemPrompt,
        contents,
        schema: skill.schema,
        timeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 18000) || 18000,
        temperature: 0.2,
    });
    return { output: skill.validate(raw, loaded, input) };
}
//# sourceMappingURL=run-skill.js.map