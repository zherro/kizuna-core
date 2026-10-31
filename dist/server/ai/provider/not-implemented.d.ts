/**
 * `NotImplementedProvider` — placeholder para providers ainda não escritos (`openai`, `claude`).
 * Sempre lança `AiUnavailableError` com `reason: 'blocked'` (não adianta tentar de novo).
 */
import type { AiProvider } from './types';
export declare class NotImplementedProvider implements AiProvider {
    readonly id: 'openai' | 'claude';
    constructor(id: 'openai' | 'claude');
    generateStructured(): Promise<Record<string, unknown>>;
}
//# sourceMappingURL=not-implemented.d.ts.map