import type { AdCandidate, AdCreative, AdFormat, AdLiveCampaign, AdSlotConfig } from './types';

export function isVigente(c: AdCreative, now: Date = new Date()): boolean {
  if (!c.active) return false;
  if (c.startsAt) {
    const t = new Date(c.startsAt).getTime();
    if (Number.isNaN(t) || t > now.getTime()) return false;
  }
  if (c.endsAt) {
    const t = new Date(c.endsAt).getTime();
    if (Number.isNaN(t) || t < now.getTime()) return false;
  }
  return true;
}

const isHttp = (u: string) => /^https?:\/\//i.test(u.trim());
/** linkUrl: só http/https. */
export const isSafeLinkUrl = isHttp;
/** imageUrl: caminho relativo ('/x', nunca '//x') ou http/https. */
export const isSafeImageUrl = (u: string) => (u.startsWith('/') && !u.startsWith('//')) || isHttp(u);

const norm = (s: string) => s.trim().toLowerCase();

/**
 * ID do bloco de anúncios do AdSense (`data-ad-slot`): só dígitos. Aceita espaços nas pontas;
 * qualquer outra coisa (código colado, `ca-pub-...`) devolve `null` e o Google fica de fora.
 */
export function normalizeAdUnit(u: string | null | undefined): string | null {
  const t = (u ?? '').trim();
  return /^\d{1,20}$/.test(t) ? t : null;
}

/** Fatia padrão dos anúncios pagos quando há campanha no ar no espaço (0..1). */
export const DEFAULT_PAID_SHARE = 0.7;

/** Fatia dos pagos limitada a 0..1; inválido → padrão. */
export function normalizePaidShare(v: unknown): number {
  const n = typeof v === 'number' ? v : Number.NaN;
  if (!Number.isFinite(n)) return DEFAULT_PAID_SHARE;
  return Math.min(Math.max(n, 0), 1);
}

export function buildCandidates(a: {
  slot: AdSlotConfig;
  format: AdFormat;
  creatives: AdCreative[];
  city?: string | null;
  now?: Date;
  googleReady: boolean;
  /**
   * Campanhas pagas no ar (plugin marketing). Ausente = comportamento antigo: todo criativo é
   * tratado igual, pelo peso. Presente: criativo com campanha NESTE espaço vira candidato `paid`;
   * criativo com campanha só em OUTRO espaço fica de fora (o anunciante comprou aquele espaço).
   */
  liveCampaigns?: AdLiveCampaign[] | null;
}): AdCandidate[] {
  const { slot, format, creatives, city, now, googleReady, liveCampaigns } = a;
  const paidHere = new Set<string>();
  const paidAnywhere = new Set<string>();
  for (const lc of liveCampaigns ?? []) {
    paidAnywhere.add(lc.creativeId);
    if (lc.slotSlug === slot.slug) paidHere.add(lc.creativeId);
  }
  const out: AdCandidate[] = [];
  for (const c of creatives) {
    if (c.format !== format || c.weight <= 0 || !isVigente(c, now)) continue;
    if (!isSafeLinkUrl(c.linkUrl) || !isSafeImageUrl(c.imageUrl)) continue;
    if (!slot.media.includes(c.kind)) continue;
    if (c.slots.length > 0 && !c.slots.includes(slot.slug)) continue;
    if (c.cities.length > 0) {
      if (!city || !c.cities.some((x) => norm(x) === norm(city))) continue;
    }
    if (paidAnywhere.has(c.id)) {
      if (!paidHere.has(c.id)) continue;
      out.push({ type: 'own', creative: c, weight: c.weight, paid: true });
      continue;
    }
    out.push({ type: 'own', creative: c, weight: c.weight });
  }
  const adUnit = normalizeAdUnit(slot.googleAdUnit);
  if (googleReady && slot.media.includes('google') && slot.googleWeight > 0 && adUnit) {
    out.push({ type: 'google', adUnit, weight: slot.googleWeight });
  }
  return out;
}

export const isPaidCandidate = (c: AdCandidate) => c.type === 'own' && c.paid === true;

/**
 * Escolhe o anúncio do espaço no modelo "pago tem prioridade, Google de vez em quando":
 *
 * - sem candidato pago: sorteio por peso entre criativos próprios do site e Google (como antes);
 * - com pago: `paidShare` (padrão 70%) das vezes sai um pago — rodízio entre as campanhas pelo peso
 *   do criativo (os do anunciante entram com peso 1, então é rodízio igual: nenhuma monopoliza); no
 *   resto sai o Google ou um criativo próprio, pelos pesos deles. Sem não-pago, sai sempre um pago.
 *
 * A cobrança das campanhas é por DIA reservado (marketing), não por impressão: dividir o espaço
 * com o Google ou com outra campanha não consome saldo de ninguém.
 */
export function pickAd(
  c: AdCandidate[],
  opts: { paidShare?: number; rand?: () => number } = {},
): AdCandidate | null {
  const rand = opts.rand ?? Math.random;
  const paid = c.filter((x) => isPaidCandidate(x) && x.weight > 0);
  const rest = c.filter((x) => !isPaidCandidate(x) && x.weight > 0);
  if (paid.length === 0) return pickWeighted(rest, rand);
  if (rest.length === 0) return pickWeighted(paid, rand);
  const share = normalizePaidShare(opts.paidShare);
  return rand() < share ? pickWeighted(paid, rand) : pickWeighted(rest, rand);
}

export function pickWeighted(c: AdCandidate[], rand: () => number = Math.random): AdCandidate | null {
  const valid = c.filter((x) => x.weight > 0);
  const total = valid.reduce((s, x) => s + x.weight, 0);
  if (total <= 0) return null;
  let r = rand() * total;
  for (const x of valid) {
    if (r < x.weight) return x;
    r -= x.weight;
  }
  return valid[valid.length - 1];
}
