/**
 * Rate limit best-effort em memória do processo. Não é distribuído (some no restart / não
 * compartilha entre instâncias) — serve só como freio anti-abuso barato para rotas de IA.
 */

const hits = new Map<string, number[]>();

const PRUNE_ABOVE = 10_000;
const HARD_CAP = 50_000;

let lastScanAt = 0;

/** Varre chaves vencidas (no máximo 1x por segundo, para não ficar O(n) a cada chave nova) e aplica o teto. */
function prune(now: number, windowMs: number): void {
  if (now - lastScanAt >= 1000) {
    lastScanAt = now;
    for (const [k, ts] of hits) {
      if (ts.length === 0 || now - ts[ts.length - 1] >= windowMs) hits.delete(k);
    }
  }
  // Map mantém a ordem de inserção (delete+set move a chave ao fim): sai a menos recente.
  for (const k of hits.keys()) {
    if (hits.size < HARD_CAP) break; // deixa espaço para a chave nova
    hits.delete(k);
  }
}

/** Só para testes. */
export function __rateLimitSize(): number {
  return hits.size;
}

export function __resetRateLimit(): void {
  hits.clear();
  lastScanAt = 0;
}

export function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  if (hits.size > PRUNE_ABOVE && !hits.has(key)) prune(now, windowMs);
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.delete(key);
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.delete(key);
  hits.set(key, recent);
  return true;
}
