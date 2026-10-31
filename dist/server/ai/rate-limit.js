/**
 * Rate limit best-effort em memória do processo. Não é distribuído (some no restart / não
 * compartilha entre instâncias) — serve só como freio anti-abuso barato para rotas de IA.
 */
const hits = new Map();
export function checkRateLimit(key, max, windowMs) {
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
//# sourceMappingURL=rate-limit.js.map