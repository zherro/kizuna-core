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

import { classifyAiError } from '../../shared/ai-error';
import type { AiUnavailableReason } from '../../shared/ai-error';

export class AiUnavailableError extends Error {
  readonly reason: AiUnavailableReason;

  constructor(message: string, options?: ErrorOptions & { reason?: AiUnavailableReason }) {
    super(message, options);
    this.name = 'AiUnavailableError';
    this.reason = options?.reason ?? classifyAiError(message);
  }
}

export function isTruthyEnv(value: string | undefined) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

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
export function isRecoverableAiError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const normalized = message.toLowerCase();

  return (
    normalized.includes('quota') ||
    normalized.includes('rate limit') ||
    normalized.includes('429') ||
    normalized.includes('exceeded') ||
    normalized.includes('no longer available') ||
    normalized.includes('not found') ||
    normalized.includes('404') ||
    // Sobrecarga transitória do modelo — não é erro que o chamador resolve tentando de novo já,
    // e não deve derrubar a feature (503 -> fallback de texto).
    normalized.includes('high demand') ||
    normalized.includes('overloaded') ||
    normalized.includes('try again later') ||
    normalized.includes('unavailable') ||
    normalized.includes('503') ||
    normalized.includes('internal error') ||
    normalized.includes('deadline exceeded') ||
    normalized.includes('fetch failed')
  );
}
