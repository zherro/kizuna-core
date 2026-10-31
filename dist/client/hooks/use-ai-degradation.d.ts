import { type AiUnavailableReason } from '../../shared/ai-error';
export type AiDegradationStatus = 'ready' | 'degraded' | 'unavailable';
export interface UseAiDegradation {
    status: AiDegradationStatus;
    /** Classifica o erro e avança a máquina de degradação. */
    report(error: unknown): void;
    /** Avança a máquina com um `reason` já classificado (ex.: 503 que devolve `reason` no corpo). */
    reportReason(reason: AiUnavailableReason): void;
    /** Só tira de `'degraded'` de volta para `'ready'` (o contador transitório fica). */
    retry(): void;
    /** Volta tudo ao estado inicial: `'ready'`, contador zerado. */
    reset(): void;
}
/**
 * Máquina de degradação sticky para features de IA no client. Espelha o
 * `registerFailure` de `useNaviAnuncio`:
 *
 * - `report(err)` com causa `'blocked'` → `'unavailable'` (permanente na vida do componente).
 * - `report(err)` com causa `'transient'` → incrementa o contador; na 5ª falha → `'unavailable'`;
 *   antes disso → `'degraded'`.
 * - `retry()` → só `'degraded'` → `'ready'`.
 * - `reset()` → `'ready'`, contador 0.
 *
 * `contextKey` hoje é só um rótulo de identidade — cada instância do hook é independente e não
 * persiste. Mantido como parâmetro para uso futuro e para o chamador se auto-documentar.
 */
export declare function useAiDegradation(contextKey: string): UseAiDegradation;
//# sourceMappingURL=use-ai-degradation.d.ts.map