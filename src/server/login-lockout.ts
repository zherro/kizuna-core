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

/** Uma faixa de escalada: ao atingir `fails` falhas acumuladas, bloqueia por `lockMs`. */
type LockoutTier = { fails: number; lockMs: number };

/**
 * Tiers progressivos default (ordem crescente de `fails`):
 *  - 5 falhas  → 1 min
 *  - 10 falhas → 5 min
 *  - 15 falhas → 30 min
 *  - 20 falhas → 2 h
 * Overridável via env `AUTH_LOCKOUT_TIERS` (JSON com o mesmo formato); JSON inválido cai no default.
 */
const DEFAULT_TIERS: LockoutTier[] = [
  { fails: 5, lockMs: 60_000 },
  { fails: 10, lockMs: 5 * 60_000 },
  { fails: 15, lockMs: 30 * 60_000 },
  { fails: 20, lockMs: 2 * 60 * 60_000 },
];

/** Nome da env de override (JSON array de `{ fails, lockMs }`). */
export const LOCKOUT_TIERS_ENV = 'AUTH_LOCKOUT_TIERS';

function isValidTiers(value: unknown): value is LockoutTier[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (t) =>
        t != null &&
        typeof t === 'object' &&
        Number.isFinite((t as LockoutTier).fails) &&
        (t as LockoutTier).fails > 0 &&
        Number.isFinite((t as LockoutTier).lockMs) &&
        (t as LockoutTier).lockMs > 0
    )
  );
}

/** Lê os tiers da env uma vez; se ausente/inválida, usa o default. Ordenados por `fails` asc. */
function resolveTiers(): LockoutTier[] {
  const raw = process.env[LOCKOUT_TIERS_ENV];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (isValidTiers(parsed)) {
        return [...parsed].sort((a, b) => a.fails - b.fails);
      }
    } catch {
      /* JSON inválido — cai no default abaixo */
    }
  }
  return DEFAULT_TIERS;
}

let TIERS = resolveTiers();

/** Maior janela de bloqueio configurada — usada como janela de "esfriamento" do contador. */
function maxLockMs(): number {
  return TIERS.reduce((max, t) => Math.max(max, t.lockMs), 0);
}

type LockoutEntry = {
  /** Falhas acumuladas dentro da janela de contagem. */
  fails: number;
  /** Timestamp (ms) até o qual a chave está bloqueada; `0` se nunca bloqueou. */
  lockedUntil: number;
  /** Timestamp (ms) da última falha registrada — base do esfriamento preguiçoso. */
  lastFailure: number;
};

const store = new Map<string, LockoutEntry>();

/**
 * Limpeza preguiçosa: se a última falha da chave foi há mais que a maior janela de
 * bloqueio e ela não está bloqueada agora, o registro é considerado velho e descartado.
 */
function readFresh(key: string, now: number): LockoutEntry | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  const stale = now - entry.lastFailure > maxLockMs() && now >= entry.lockedUntil;
  if (stale) {
    store.delete(key);
    return undefined;
  }
  return entry;
}

/**
 * Verifica se a chave está bloqueada agora.
 * @returns `{ locked, retryAfterSec }` — `retryAfterSec` é o tempo restante arredondado pra cima.
 */
export function checkLockout(key: string): { locked: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = readFresh(key, now);
  if (entry && now < entry.lockedUntil) {
    return { locked: true, retryAfterSec: Math.ceil((entry.lockedUntil - now) / 1000) };
  }
  return { locked: false, retryAfterSec: 0 };
}

/**
 * Registra uma falha de login para a chave e recalcula o bloqueio.
 *
 * O contador "esfria": se a última falha foi há mais que a maior janela de bloqueio,
 * `fails` volta a zero antes do incremento. `lockedUntil` = agora + `lockMs` do maior
 * tier cujo `fails` já foi atingido (0 se ainda abaixo do primeiro tier).
 */
export function recordLoginFailure(key: string): { lockedUntil: number; fails: number } {
  const now = Date.now();
  const existing = store.get(key);
  const cooled = !existing || now - existing.lastFailure > maxLockMs();
  const fails = (cooled ? 0 : existing!.fails) + 1;

  let lockMs = 0;
  for (const tier of TIERS) {
    if (fails >= tier.fails) lockMs = tier.lockMs;
  }
  const lockedUntil = lockMs > 0 ? now + lockMs : 0;

  store.set(key, { fails, lockedUntil, lastFailure: now });
  return { lockedUntil, fails };
}

/** Zera o estado da chave — chamar no login com sucesso. */
export function clearLoginFailures(key: string): void {
  store.delete(key);
}

/** Só para testes: limpa o Map e recarrega os tiers da env atual. */
export function __resetLockout(): void {
  store.clear();
  TIERS = resolveTiers();
}
