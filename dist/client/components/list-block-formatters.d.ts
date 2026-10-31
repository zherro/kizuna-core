export type NamedFormatter = (value: unknown, item: Record<string, unknown>) => string;
/**
 * Formatters de domínio (não expressáveis como dado puro) keyed por nome, para
 * `screens/*.ts` referenciarem via `format: { type: 'named', name: '...' }`.
 * Começa vazio — o projeto consumidor registra os seus com
 * `registerNamedFormatter('servicePrice', fn)` num módulo importado cedo.
 * Nome não registrado cai no formato `text`.
 */
export declare const NAMED_FORMATTERS: Record<string, NamedFormatter>;
export declare function registerNamedFormatter(name: string, fn: NamedFormatter): void;
//# sourceMappingURL=list-block-formatters.d.ts.map