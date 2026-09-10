/**
 * Helpers compartilhados de erro/env para as integrações de IA (server-side).
 * Extraído de `generate-marketplace-description.ts` — reusado por `search-agent` e `anuncio-agent`.
 */
/**
 * Sinaliza ao route handler que a IA está indisponível e ele deve degradar para o caminho manual
 * (503 + `{ fallback: 'text' }`). Usado tanto pelo `search-agent` (busca por texto) quanto pelo
 * `anuncio-agent` (preencher o wizard na mão).
 */
export { classifyAiError, type AiUnavailableReason } from '../../shared/ai-error';
import type { AiUnavailableReason } from '../../shared/ai-error';
export declare class AiUnavailableError extends Error {
    readonly reason: AiUnavailableReason;
    constructor(message: string, options?: ErrorOptions & {
        reason?: AiUnavailableReason;
    });
}
/**
 * Rate limit local do orquestrador (`runSkill` → `checkRateLimit`) estourado — o usuário mandou
 * pedidos demais rápido demais. Distinto de `AiUnavailableError`: não é a IA que falhou, é o
 * gate. Estende `AiUnavailableError` só para os `catch (instanceof AiUnavailableError)` genéricos
 * continuarem degradando de leve em vez de 500; a rota que quer o 429 correto checa esta classe
 * primeiro. Nunca deve queimar strike da máquina de degradação.
 */
export declare class AiRateLimitedError extends AiUnavailableError {
    readonly retryAfterSec?: number;
    constructor(message: string, options?: ErrorOptions & {
        retryAfterSec?: number;
    });
}
export declare function isTruthyEnv(value: string | undefined): boolean;
/**
 * Whether `error` is an environmental/transient Gemini failure worth falling back for (a local
 * template for description generation, or the plain-text search for the chat), rather than
 * failing the whole caller.
 *
 * Originally just quota/rate-limit — broadened after a live model deprecation
 * ("This model models/gemini-2.0-flash is no longer available...") propagated as a hard error
 * with `AI_FALLBACK_TO_TEMPLATE=1` set, since none of the quota-only substrings matched it. A
 * dead/renamed model is exactly this category too: not something the caller can retry past, and
 * not a reason to block the feature.
 */
export declare function isRecoverableAiError(error: unknown): boolean;
//# sourceMappingURL=errors.d.ts.map