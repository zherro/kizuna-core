/**
 * Lê um valor de `auth.system_config` pela chave.
 *
 * A coluna `value` é jsonb — o PostgREST devolve o valor já parseado, então
 * `rows[0].value` já é o valor JS diretamente (string, objeto, etc.).
 * Retorna `null` quando a chave não existe ou em qualquer falha.
 */
export declare function readSystemConfig<T = unknown>(key: string): Promise<T | null>;
//# sourceMappingURL=system-config.d.ts.map