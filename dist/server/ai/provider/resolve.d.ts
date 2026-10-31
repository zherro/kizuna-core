/**
 * `resolveProvider` / `resolveModel` — escolhe o provider de IA em runtime a partir do
 * `system_config` (`ai_assistant.provider` / `ai_assistant.model`), com fallback para env e default.
 *
 * - provider: `system_config['ai_assistant.provider']` ?? `'gemini'`
 * - model: `system_config['ai_assistant.model']` → env `GEMINI_MODEL` → `'gemini-3.6-flash'`
 *
 * `gemini` sem `GEMINI_API_KEY` lança `AiUnavailableError` (`reason: 'blocked'`).
 * `openai`/`claude` retornam `NotImplementedProvider`. Qualquer outro valor → `blocked`.
 */
import type { AiProvider } from './types';
export declare function resolveModel(): Promise<string>;
export declare function resolveProvider(): Promise<AiProvider>;
//# sourceMappingURL=resolve.d.ts.map