/**
 * `resolveProvider` / `resolveModel` — escolhe o provider de IA em runtime a partir do
 * `system_config` (`ai_assistant.provider` / `ai_assistant.model`), com fallback para env e default.
 * Aceita um override `{ provider, model }` (ex.: prompt de revisão com provider próprio).
 *
 * - provider: override → `system_config['ai_assistant.provider']` → `'gemini'`
 * - model: override → `system_config['ai_assistant.model']` (claude: só se o provider global
 *   também for claude) → env `GEMINI_MODEL` (gemini) → default do provider
 * - chave: `getProviderKey` (`ai_credentials` cifrada → env). Ausente ⇒ `AiUnavailableError` blocked.
 *
 * `openai` retorna `NotImplementedProvider`. Qualquer outro valor → `blocked`.
 */

import { AiUnavailableError } from '../errors';
import { getProviderKey } from '../credentials';
import { readSystemConfig } from '../system-config';
import type { AiProvider } from './types';
import { GeminiProvider } from './gemini';
import { ClaudeProvider, CLAUDE_DEFAULT_MODEL } from './claude';
import { NotImplementedProvider } from './not-implemented';

export interface ProviderOverride {
  provider?: string | null;
  model?: string | null;
}

export async function resolveModel(): Promise<string> {
  return (
    (await readSystemConfig<string>('ai_assistant.model')) ||
    String(process.env.GEMINI_MODEL ?? '').trim() ||
    'gemini-3.6-flash'
  );
}

export async function resolveProvider(override?: ProviderOverride): Promise<AiProvider> {
  const configured = (await readSystemConfig<string>('ai_assistant.provider')) ?? 'gemini';
  const cfg = override?.provider || configured;
  const overrideModel = String(override?.model ?? '').trim();

  switch (cfg) {
    case 'gemini': {
      const key = await getProviderKey('gemini');
      if (!key) {
        throw new AiUnavailableError('GEMINI_API_KEY não configurada.', { reason: 'blocked' });
      }
      return new GeminiProvider({ apiKey: key, model: overrideModel || (await resolveModel()) });
    }
    case 'claude': {
      const key = await getProviderKey('claude');
      if (!key) {
        throw new AiUnavailableError('Chave da Anthropic (ANTHROPIC_API_KEY) não configurada.', {
          reason: 'blocked',
        });
      }
      const globalModel =
        configured === 'claude'
          ? String((await readSystemConfig<string>('ai_assistant.model')) ?? '').trim()
          : '';
      return new ClaudeProvider({
        apiKey: key,
        model: overrideModel || globalModel || CLAUDE_DEFAULT_MODEL,
      });
    }
    case 'openai':
      return new NotImplementedProvider(cfg);
    default:
      throw new AiUnavailableError(`provider "${cfg}" desconhecido.`, { reason: 'blocked' });
  }
}
