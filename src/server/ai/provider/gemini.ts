/**
 * `GeminiProvider` — implementação de `AiProvider` sobre a API `generateContent` do Gemini v1beta.
 *
 * Corpo (fetch → `res.ok` → `isRecoverableAiError` → parse `candidates[0].content.parts` →
 * `JSON.parse`) extraído de `src/lib/server/ai/anuncio-agent/index.ts` (app consumidor) e
 * parametrizado por `AiStructuredRequest` + `{ apiKey, model }` do construtor. Sem leitura de env
 * aqui — quem resolve env/model é o `resolveProvider` (Task 5).
 */

import { AiUnavailableError, isRecoverableAiError } from '../errors';
import type { AiProvider, AiStructuredRequest } from './types';

type GeminiPart = { text?: string };

export class GeminiProvider implements AiProvider {
  readonly id = 'gemini' as const;

  constructor(private readonly opts: { apiKey: string; model: string }) {}

  async generateStructured(req: AiStructuredRequest): Promise<Record<string, unknown>> {
    const { apiKey, model } = this.opts;

    let res: Response;
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          model
        )}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          signal: AbortSignal.timeout(req.timeoutMs),
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: req.systemPrompt }] },
            contents: req.contents,
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: req.schema,
              temperature: req.temperature ?? 0.2,
              thinkingConfig: { thinkingBudget: 512 },
            },
          }),
        }
      );
    } catch (cause) {
      throw new AiUnavailableError('Falha ao chamar o Gemini (timeout ou rede).', { cause });
    }

    const data = (await res.json().catch(() => null)) as {
      candidates?: { content?: { parts?: GeminiPart[] } }[];
      error?: { message?: string };
    } | null;

    if (!res.ok) {
      const message = data?.error?.message ?? `Gemini respondeu ${res.status}.`;
      if (isRecoverableAiError(new Error(message))) throw new AiUnavailableError(message);
      throw new Error(message);
    }

    const raw =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => String(p?.text ?? ''))
        .join('')
        .trim() ?? '';

    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new AiUnavailableError('Resposta da IA em formato inesperado.');
    }
  }
}
