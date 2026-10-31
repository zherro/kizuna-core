/**
 * `GeminiProvider` — implementação de `AiProvider` sobre a API `generateContent` do Gemini v1beta.
 *
 * Corpo (fetch → `res.ok` → `isRecoverableAiError` → parse `candidates[0].content.parts` →
 * `JSON.parse`) extraído de `src/lib/server/ai/anuncio-agent/index.ts` (app consumidor) e
 * parametrizado por `AiStructuredRequest` + `{ apiKey, model }` do construtor. Sem leitura de env
 * aqui — quem resolve env/model é o `resolveProvider` (Task 5).
 */
import { AiUnavailableError, isRecoverableAiError } from '../errors';
export class GeminiProvider {
    constructor(opts) {
        Object.defineProperty(this, "opts", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: opts
        });
        Object.defineProperty(this, "id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'gemini'
        });
    }
    async generateStructured(req) {
        const { apiKey, model } = this.opts;
        let res;
        try {
            res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
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
            });
        }
        catch (cause) {
            throw new AiUnavailableError('Falha ao chamar o Gemini (timeout ou rede).', { cause });
        }
        const data = (await res.json().catch(() => null));
        if (!res.ok) {
            const message = data?.error?.message ?? `Gemini respondeu ${res.status}.`;
            if (isRecoverableAiError(new Error(message)))
                throw new AiUnavailableError(message);
            throw new Error(message);
        }
        const raw = data?.candidates?.[0]?.content?.parts
            ?.map((p) => String(p?.text ?? ''))
            .join('')
            .trim() ?? '';
        try {
            return JSON.parse(raw);
        }
        catch {
            throw new AiUnavailableError('Resposta da IA em formato inesperado.');
        }
    }
}
//# sourceMappingURL=gemini.js.map