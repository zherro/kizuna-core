import { isPublicIp, normalizeIp } from '../../shared/analytics/ip';

/**
 * Região aproximada (cidade/UF) de um visitante, para as métricas. Ordem:
 *   1. headers da plataforma (Vercel: `x-vercel-ip-city` url-encoded + `x-vercel-ip-country-region`;
 *      Cloudflare: `cf-ipcity` + `cf-region-code`) — sem chamada externa;
 *   2. ip-api.com (plano gratuito, só HTTP — o mesmo da rota `/api/location/ip`), com timeout de
 *      1,5 s e cache em memória por IP (10 min, no máximo 5000 entradas, sai a mais antiga).
 *      Pedidos simultâneos do mesmo IP compartilham a chamada. Circuit breaker: 429 ou `X-Rl: 0`
 *      pausa o ip-api por `X-Ttl` segundos (padrão 60) — nesse tempo a resposta é `null`.
 * Só vale Brasil (país informado e = BR, inclusive nos headers da plataforma) e UF de 2 letras.
 * Qualquer falha → `null` (nunca lança). O IP nunca é logado.
 */

export type IpRegion = { city: string; uf: string };

type LookupOptions = { fetchImpl?: typeof fetch; now?: () => number };

const IP_API_URL = 'http://ip-api.com/json/';
const TIMEOUT_MS = 1500;
const TTL_MS = 10 * 60_000;
const MAX_ENTRIES = 5000;
const UF = /^[A-Z]{2}$/;

const DEFAULT_PAUSE_S = 60;

type CacheEntry = { at: number; value: IpRegion | null };
const cache = new Map<string, CacheEntry>();
/** Consulta em andamento por IP: pedidos simultâneos do mesmo IP compartilham uma chamada. */
const inflight = new Map<string, Promise<IpRegion | null>>();
/** Circuit breaker: até este instante (ms) o ip-api não é consultado (limite do plano gratuito). */
let pausedUntil = 0;

/** Só para testes: zera cache, consultas em andamento e o circuit breaker. */
export function __resetIpRegionCache(): void {
  cache.clear();
  inflight.clear();
  pausedUntil = 0;
}

/** 429 ou `X-Rl: 0` → pausa por `X-Ttl` segundos (padrão 60). */
function updateBreaker(res: Response, now: number): void {
  const remaining = res.headers.get('x-rl');
  if (res.status !== 429 && remaining?.trim() !== '0') return;
  const raw = res.headers.get('x-ttl')?.trim();
  const ttl = raw ? Number(raw) : NaN;
  const seconds = Number.isFinite(ttl) && ttl >= 0 ? ttl : DEFAULT_PAUSE_S;
  pausedUntil = now + seconds * 1000;
}

function cleanCity(raw: string | null | undefined): string {
  if (!raw) return '';
  let city = raw;
  try {
    city = decodeURIComponent(raw);
  } catch {
    // valor não codificado (ou malformado): usa como veio
  }
  return city.trim().slice(0, 80);
}

function toRegion(country: string | null, ufRaw: unknown, cityRaw: unknown): IpRegion | null {
  if (!country || country.trim().toUpperCase() !== 'BR') return null;
  const uf = typeof ufRaw === 'string' ? ufRaw.trim().toUpperCase() : '';
  if (!UF.test(uf)) return null;
  return { city: typeof cityRaw === 'string' ? cleanCity(cityRaw) : '', uf };
}

/** Headers da plataforma. `undefined` = a plataforma não informou nada (tenta o ip-api). */
function fromPlatformHeaders(headers: Headers): IpRegion | null | undefined {
  const vercelUf = headers.get('x-vercel-ip-country-region');
  if (vercelUf) {
    return toRegion(
      headers.get('x-vercel-ip-country'),
      vercelUf,
      headers.get('x-vercel-ip-city')
    );
  }
  const cfUf = headers.get('cf-region-code');
  if (cfUf) {
    return toRegion(headers.get('cf-ipcountry'), cfUf, headers.get('cf-ipcity'));
  }
  return undefined;
}

function remember(ip: string, value: IpRegion | null, at: number): void {
  cache.delete(ip);
  cache.set(ip, { at, value });
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

export async function lookupIpRegion(
  ip: string,
  headers: Headers,
  opts: LookupOptions = {}
): Promise<IpRegion | null> {
  try {
    const platform = fromPlatformHeaders(headers);
    if (platform !== undefined) return platform;

    const norm = normalizeIp(ip ?? '');
    if (!norm || !isPublicIp(norm)) return null;

    const now = opts.now ?? Date.now;
    const hit = cache.get(norm);
    if (hit && now() - hit.at < TTL_MS) return hit.value;

    const pending = inflight.get(norm);
    if (pending) return await pending;

    if (now() < pausedUntil) return null;

    const job = queryIpApi(norm, opts.fetchImpl ?? fetch, now).catch(() => null);
    inflight.set(norm, job);
    try {
      return await job;
    } finally {
      inflight.delete(norm);
    }
  } catch {
    return null;
  }
}

async function queryIpApi(
  ip: string,
  fetchImpl: typeof fetch,
  now: () => number
): Promise<IpRegion | null> {
  const res = await fetchImpl(
    `${IP_API_URL}${encodeURIComponent(ip)}?fields=status,countryCode,region,city`,
    { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) }
  );
  updateBreaker(res, now());
  if (!res.ok) return null; // 429/5xx: transitório, não guarda
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!data) return null;

  const value =
    data.status === 'success'
      ? toRegion(typeof data.countryCode === 'string' ? data.countryCode : '', data.region, data.city)
      : null;
  // Resposta definitiva (sucesso, fora do Brasil ou 'fail' de faixa reservada) vai pro cache.
  remember(ip, value, now());
  return value;
}
