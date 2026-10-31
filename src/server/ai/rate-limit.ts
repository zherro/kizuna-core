/**
 * Rate limit best-effort em memória do processo. Não é distribuído (some no restart / não
 * compartilha entre instâncias) — serve só como freio anti-abuso barato para rotas de IA.
 */

const hits = new Map<string, number[]>();

export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}
