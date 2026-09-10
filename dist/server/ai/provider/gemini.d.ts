/**
 * `GeminiProvider` — implementação de `AiProvider` sobre a API `generateContent` do Gemini v1beta.
 *
 * Corpo (fetch → `res.ok` → `isRecoverableAiError` → parse `candidates[0].content.parts` →
 * `JSON.parse`) extraído de `src/lib/server/ai/anuncio-agent/index.ts` (app consumidor) e
 * parametrizado por `AiStructuredRequest` + `{ apiKey, model }` do construtor. Sem leitura de env
 * aqui — quem resolve env/model é o `resolveProvider` (Task 5).
 */
import type { AiProvider, AiStructuredRequest } from './types';
export declare class GeminiProvider implements AiProvider {
    private readonly opts;
    readonly id: "gemini";
    constructor(opts: {
        apiKey: string;
        model: string;
    });
    generateStructured(req: AiStructuredRequest): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=gemini.d.ts.map