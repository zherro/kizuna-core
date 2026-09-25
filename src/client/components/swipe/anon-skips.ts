const KEY = 'kizuna.swipe.anonSkips';
export const ANON_SKIPS_MAX = 500;

export function readAnonSkips(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown;
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function addAnonSkip(uid: string): void {
  const next = [...readAnonSkips().filter((u) => u !== uid), uid].slice(-ANON_SKIPS_MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage cheio/bloqueado: o item só pode reaparecer */
  }
}

export function clearAnonSkips(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
