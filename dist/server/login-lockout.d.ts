/**
 * Lockout progressivo de login — best-effort **em memória do processo**.
 *
 * Some no restart e não é compartilhado entre instâncias (não é distribuído — o limiter
 * distribuído é item separado do `docs/PENDENCIAS.md`). Complementa o rate-limit por IP
 * (`auth-rate-limit` no app / `checkRateLimit` no core): o rate-limit trava rajada de
 * requests; o lockout trava tentativas de senha errada para uma mesma chave, com escalada
 * progressiva da janela de bloqueio conforme as falhas acumulam.
 *
 * A chave é uma string opaca montada pelo caller (ex.: `login.toLowerCase()` ou o IP —
 * quem chama decide). Aqui é tratada só como string.
 */
/** Nome da env de override (JSON array de `{ fails, lockMs }`). */
export declare const LOCKOUT_TIERS_ENV = "AUTH_LOCKOUT_TIERS";
/**
 * Verifica se a chave está bloqueada agora.
 * @returns `{ locked, retryAfterSec }` — `retryAfterSec` é o tempo restante arredondado pra cima.
 */
export declare function checkLockout(key: string): {
    locked: boolean;
    retryAfterSec: number;
};
/**
 * Registra uma falha de login para a chave e recalcula o bloqueio.
 *
 * O contador "esfria": se a última falha foi há mais que a maior janela de bloqueio,
 * `fails` volta a zero antes do incremento. `lockedUntil` = agora + `lockMs` do maior
 * tier cujo `fails` já foi atingido (0 se ainda abaixo do primeiro tier).
 */
export declare function recordLoginFailure(key: string): {
    lockedUntil: number;
    fails: number;
};
/** Zera o estado da chave — chamar no login com sucesso. */
export declare function clearLoginFailures(key: string): void;
/** Só para testes: limpa o Map e recarrega os tiers da env atual. */
export declare function __resetLockout(): void;
//# sourceMappingURL=login-lockout.d.ts.map