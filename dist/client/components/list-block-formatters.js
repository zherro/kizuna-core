// SEM 'use client' de propósito — `list-block.tsx` é client, mas o registro dos
// formatters é chamado de módulos que também carregam no servidor (os
// `screens/*.ts` são lidos por Server Components). Manter isto num módulo
// neutro deixa `registerNamedFormatter()` ser chamado dos dois lados sem o erro
// "client function from server". Cada bundle (server/client) tem sua cópia do
// mapa; o que importa é o do CLIENT, populado quando o módulo do consumidor
// (ex.: `service-type.ts`) carrega no cliente antes da lista renderizar.
/**
 * Formatters de domínio (não expressáveis como dado puro) keyed por nome, para
 * `screens/*.ts` referenciarem via `format: { type: 'named', name: '...' }`.
 * Começa vazio — o projeto consumidor registra os seus com
 * `registerNamedFormatter('servicePrice', fn)` num módulo importado cedo.
 * Nome não registrado cai no formato `text`.
 */
export const NAMED_FORMATTERS = {};
export function registerNamedFormatter(name, fn) {
    NAMED_FORMATTERS[name] = fn;
}
//# sourceMappingURL=list-block-formatters.js.map