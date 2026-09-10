/**
 * Rate limit best-effort em memória do processo. Não é distribuído (some no restart / não
 * compartilha entre instâncias) — serve só como freio anti-abuso barato para rotas de IA.
 */
export declare function checkRateLimit(key: string, max: number, windowMs: number): boolean;
//# sourceMappingURL=rate-limit.d.ts.map