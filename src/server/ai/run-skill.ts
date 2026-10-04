import { AiRateLimitedError, AiUnavailableError } from './errors';
import { checkRateLimit } from './rate-limit';
import { readSystemConfig } from './system-config';
import { resolveProvider } from './provider/resolve';
import type { AiUsage } from './provider/types';
import { getSkill, type AiSkillContext } from './skill';

/**
 * Orquestrador: resolve a skill, checa o toggle de contexto e o rate limit,
 * resolve o provedor, carrega contexto, monta o prompt, chama o provedor e
 * devolve a saída já validada pela skill.
 */
export interface RunSkillOptions {
  /** Override de provider/modelo/temperatura (ex.: vindo de `ai_prompts`). */
  provider?: string | null;
  model?: string | null;
  temperature?: number | null;
}

export interface RunSkillResult<O> {
  output: O;
  provider: string;
  model: string | null;
  usage: AiUsage | null;
}

export async function runSkill<I, O>(
  skillKey: string,
  input: I,
  ctx: AiSkillContext,
  opts?: RunSkillOptions
): Promise<RunSkillResult<O>> {
  const skill = getSkill(skillKey);
  if (!skill) {
    throw new AiUnavailableError(`skill "${skillKey}" não registrada.`, { reason: 'blocked' });
  }

  const contexts = await readSystemConfig<Record<string, boolean>>('ai_assistant.contexts');
  if (contexts?.[skill.context] === false) {
    // Só `=== false` desliga; ausente = ligado.
    throw new AiUnavailableError(`contexto "${skill.context}" desligado.`, { reason: 'blocked' });
  }

  if (
    skill.rateLimit &&
    !checkRateLimit(`${skillKey}:${ctx.userId}`, skill.rateLimit.max, skill.rateLimit.windowMs)
  ) {
    throw new AiRateLimitedError('rate limit.', {
      retryAfterSec: Math.ceil(skill.rateLimit.windowMs / 1000),
    });
  }

  const provider = await resolveProvider({
    provider: opts?.provider,
    model: opts?.model,
    db: ctx.db,
  });
  const loaded = (await skill.loadContext?.(input, ctx)) as unknown;
  const { systemPrompt, contents } = skill.buildPrompt(input, loaded);
  const req = {
    systemPrompt,
    contents,
    schema: skill.schema,
    timeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 18000) || 18000,
    temperature: opts?.temperature ?? 0.2,
  };
  let raw: Record<string, unknown>;
  let usage: AiUsage | null = null;
  let model: string | null = provider.model ?? null;
  if (provider.generateStructuredWithUsage) {
    const r = await provider.generateStructuredWithUsage(req);
    raw = r.output;
    usage = r.usage ?? null;
    model = r.model ?? model;
  } else {
    raw = await provider.generateStructured(req);
  }
  return {
    output: skill.validate(raw, loaded, input) as O,
    provider: provider.id,
    model,
    usage,
  };
}
