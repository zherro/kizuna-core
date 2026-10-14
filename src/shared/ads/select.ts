import type { AdCandidate, AdCreative, AdFormat, AdSlotConfig } from './types';

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

export function buildCandidates(a: {
  slot: AdSlotConfig;
  format: AdFormat;
  creatives: AdCreative[];
  city?: string | null;
  now?: Date;
  googleReady: boolean;
}): AdCandidate[] {
  const { slot, format, creatives, city, now, googleReady } = a;
  const out: AdCandidate[] = [];
  for (const c of creatives) {
    if (c.format !== format || c.weight <= 0 || !isVigente(c, now)) continue;
    if (!isSafeLinkUrl(c.linkUrl) || !isSafeImageUrl(c.imageUrl)) continue;
    if (!slot.media.includes(c.kind)) continue;
    if (c.slots.length > 0 && !c.slots.includes(slot.slug)) continue;
    if (c.cities.length > 0) {
      if (!city || !c.cities.some((x) => norm(x) === norm(city))) continue;
    }
    out.push({ type: 'own', creative: c, weight: c.weight });
  }
  if (googleReady && slot.media.includes('google') && slot.googleWeight > 0 && slot.googleAdUnit) {
    out.push({ type: 'google', adUnit: slot.googleAdUnit, weight: slot.googleWeight });
  }
  return out;
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
