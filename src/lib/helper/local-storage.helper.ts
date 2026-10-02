/**
 * localStorage seguro: nunca lança. Sem `window` (SSR), aba anônima com storage bloqueado, quota
 * cheia ou JSON corrompido → leitura devolve `null` e escrita devolve `false`. Valores vão como JSON.
 * Use só para conveniência do visitante (preferência, card dispensado) — nada que precise persistir.
 */

const DAY_MS = 86_400_000;

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Lê e faz parse do JSON gravado em `key`. Ausente, inválido ou indisponível → `null`. */
export function readStorage<T>(key: string): T | null {
  try {
    const raw = storage()?.getItem(key);
    return raw == null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

/** Grava `value` como JSON em `key`. Devolve `false` se o storage recusar. */
export function writeStorage(key: string, value: unknown): boolean {
  try {
    const s = storage();
    if (!s) return false;
    s.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeStorage(key: string): void {
  try {
    storage()?.removeItem(key);
  } catch {
    // storage indisponível: nada a remover
  }
}

/** Adia algo (ex.: card dispensado) por `days` dias a partir de `now`. Grava `{ until }` em `key`. */
export function snooze(key: string, days: number, now = Date.now()): boolean {
  return writeStorage(key, { until: now + days * DAY_MS });
}

/**
 * `true` enquanto o prazo de `snooze(key, …)` não venceu. Prazo vencido limpa a chave; sem
 * registro ou registro inválido → `false` (mostra de novo).
 */
export function isSnoozed(key: string, now = Date.now()): boolean {
  const until = readStorage<{ until?: unknown }>(key)?.until;
  if (typeof until !== 'number') return false;
  if (now < until) return true;
  removeStorage(key);
  return false;
}
