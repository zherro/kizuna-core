/**
 * Classificador isomórfico de erro de IA — string matching puro, sem dependências de
 * `next/*`, node built-ins ou React. Importável tanto do server (`server/ai/errors.ts`)
 * quanto do client (`client/hooks/use-ai-degradation.ts`).
 */
/**
 * `'blocked'` — causa conhecida que não adianta tentar de novo já (quota estourada, billing,
 * chave inválida, modelo removido). O cliente entra direto em modo manual permanente.
 * `'transient'` — timeout, sobrecarga, rede. Vale oferecer "tentar de novo".
 */
export type AiUnavailableReason = 'blocked' | 'transient';
/**
 * Classifica a mensagem de erro do provedor de IA em `'blocked'` (causa conhecida, sem retry) ou
 * `'transient'` (vale tentar de novo). Usado pra decidir entre o aviso "tentar de novo" e o modo
 * manual permanente ("à moda antiga").
 */
export declare function classifyAiError(error: unknown): AiUnavailableReason;
//# sourceMappingURL=ai-error.d.ts.map