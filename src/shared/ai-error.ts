/**
 * Classificador isomórfico de erro de IA — string matching puro, sem dependências de
 * `next/*`, node built-ins ou React. Importável tanto do server (`server/ai/errors.ts`)
 * quanto do client (`client/hooks/use-ai-degradation.ts`).
 */

/**
 * `'blocked'` — causa conhecida que não adianta tentar de novo já (quota estourada, billing,
 * chave inválida, modelo removido). O cliente entra direto em modo manual permanente.
 * `'transient'` — timeout, sobrecarga, rede. Vale oferecer "tentar de novo".
 */
export type AiUnavailableReason = 'blocked' | 'transient';

/**
 * Classifica a mensagem de erro do provedor de IA em `'blocked'` (causa conhecida, sem retry) ou
 * `'transient'` (vale tentar de novo). Usado pra decidir entre o aviso "tentar de novo" e o modo
 * manual permanente ("à moda antiga").
 */
export function classifyAiError(error: unknown): AiUnavailableReason {
  const normalized = (error instanceof Error ? error.message : String(error ?? '')).toLowerCase();

  const blocked =
    normalized.includes('quota') ||
    normalized.includes('exceeded') ||
    normalized.includes('resource_exhausted') ||
    normalized.includes('rate limit') ||
    normalized.includes('429') ||
    normalized.includes('billing') ||
    normalized.includes('permission') ||
    normalized.includes('permission_denied') ||
    normalized.includes('403') ||
    normalized.includes('api key not valid') ||
    normalized.includes('api_key_invalid') ||
    normalized.includes('invalid api key') ||
    normalized.includes('service_disabled') ||
    normalized.includes('not configured') ||
    normalized.includes('não configurada') ||
    normalized.includes('no longer available') ||
    normalized.includes('not found') ||
    normalized.includes('404');

  return blocked ? 'blocked' : 'transient';
}
