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
import { AiUnavailableError } from '../errors';
import { readSystemConfig } from '../system-config';
import { GeminiProvider } from './gemini';
import { NotImplementedProvider } from './not-implemented';
export async function resolveModel() {
    return ((await readSystemConfig('ai_assistant.model')) ||
        String(process.env.GEMINI_MODEL ?? '').trim() ||
        'gemini-3.6-flash');
}
export async function resolveProvider() {
    const cfg = (await readSystemConfig('ai_assistant.provider')) ?? 'gemini';
    switch (cfg) {
        case 'gemini': {
            const key = String(process.env.GEMINI_API_KEY ?? '').trim();
            if (!key) {
                throw new AiUnavailableError('GEMINI_API_KEY não configurada.', { reason: 'blocked' });
            }
            return new GeminiProvider({ apiKey: key, model: await resolveModel() });
        }
        case 'openai':
        case 'claude':
            return new NotImplementedProvider(cfg);
        default:
            throw new AiUnavailableError(`provider "${cfg}" desconhecido.`, { reason: 'blocked' });
    }
}
//# sourceMappingURL=resolve.js.map