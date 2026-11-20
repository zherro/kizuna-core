import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PAID_SHARE,
  buildCandidates,
  normalizeAdUnit,
  normalizePaidShare,
  pickAd,
  type AdCandidate,
  type AdCreative,
  type AdSlotConfig,
} from '../../shared/ads';

// Sorteio do espaço: pago com prioridade, Google "de vez em quando", rodízio justo entre campanhas.

/** PRNG determinístico (mulberry32) para as proporções não dependerem da sorte. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const slot: AdSlotConfig = {
  slug: 'home-meio', enabled: true, media: ['imagem', 'gif', 'google'],
  googleWeight: 100, googleAdUnit: '1234567890', rotateSeconds: 0,
};
const mk = (id: string, o: Partial<AdCreative> = {}): AdCreative => ({
  id, format: 'banner', kind: 'imagem', imageUrl: '/a.webp', alt: id, linkUrl: 'https://x.com',
  label: id, weight: 1, startsAt: null, endsAt: null, cities: [], slots: [], active: true, ...o,
});
const now = new Date('2026-11-20T12:00:00Z');
const key = (c: AdCandidate | null) => (c ? (c.type === 'google' ? 'google' : c.creative.id) : 'null');

function tally(cands: AdCandidate[], n: number, paidShare?: number, seed = 42) {
  const rand = seeded(seed);
  const out: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    const k = key(pickAd(cands, { paidShare, rand }));
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

describe('buildCandidates com campanhas no ar', () => {
  const creatives = [mk('casa'), mk('pago-a'), mk('pago-b'), mk('pago-outro-espaco')];
  const liveCampaigns = [
    { creativeId: 'pago-a', slotSlug: 'home-meio' },
    { creativeId: 'pago-b', slotSlug: 'home-meio' },
    { creativeId: 'pago-outro-espaco', slotSlug: 'cidade-topo' },
  ];

  it('marca pago só com campanha NESTE espaço e tira o que comprou outro espaço', () => {
    const r = buildCandidates({ slot, format: 'banner', creatives, now, googleReady: true, liveCampaigns });
    expect(r.map((c) => [key(c), c.type === 'own' ? !!c.paid : false])).toEqual([
      ['casa', false], ['pago-a', true], ['pago-b', true], ['google', false],
    ]);
  });

  it('sem liveCampaigns: comportamento antigo (ninguém é pago, ninguém sai)', () => {
    const r = buildCandidates({ slot, format: 'banner', creatives, now, googleReady: true });
    expect(r.map(key)).toEqual(['casa', 'pago-a', 'pago-b', 'pago-outro-espaco', 'google']);
    expect(r.some((c) => c.type === 'own' && c.paid)).toBe(false);
  });

  it('ad unit do Google precisa ser só dígitos', () => {
    expect(normalizeAdUnit(' 1234567890 ')).toBe('1234567890');
    expect(normalizeAdUnit('ca-pub-123')).toBeNull();
    expect(normalizeAdUnit('<ins data-ad-slot="1">')).toBeNull();
    expect(normalizeAdUnit('')).toBeNull();
    const bad = buildCandidates({
      slot: { ...slot, googleAdUnit: 'ca-pub-1' }, format: 'banner', creatives: [], now, googleReady: true,
    });
    expect(bad).toEqual([]);
  });
});

describe('pickAd', () => {
  const google: AdCandidate = { type: 'google', adUnit: '1', weight: 100 };
  const casa: AdCandidate = { type: 'own', creative: mk('casa'), weight: 50 };
  const paid = (id: string, weight = 1): AdCandidate => ({ type: 'own', creative: mk(id), weight, paid: true });

  it('padrão ~70% pago / ~30% Google quando há campanha (N = 20 000)', () => {
    const n = 20_000;
    const t = tally([paid('a'), google], n);
    expect(DEFAULT_PAID_SHARE).toBe(0.7);
    expect(Math.abs(t.a / n - 0.7)).toBeLessThan(0.02);
    expect(Math.abs(t.google / n - 0.3)).toBeLessThan(0.02);
  });

  it('proporção configurável (paidShare 0.5 e 0.9)', () => {
    const n = 20_000;
    const half = tally([paid('a'), google], n, 0.5);
    expect(Math.abs(half.a / n - 0.5)).toBeLessThan(0.02);
    const most = tally([paid('a'), google], n, 0.9);
    expect(Math.abs(most.a / n - 0.9)).toBeLessThan(0.02);
  });

  it('rodízio justo entre campanhas: nenhuma monopoliza (peso 1 cada)', () => {
    const n = 30_000;
    const t = tally([paid('a'), paid('b'), paid('c'), google], n);
    for (const id of ['a', 'b', 'c']) {
      // 70% divididos por 3 ≈ 23,3% cada
      expect(Math.abs(t[id] / n - 0.7 / 3)).toBeLessThan(0.02);
    }
    expect(Math.abs(t.google / n - 0.3)).toBeLessThan(0.02);
  });

  it('a fatia não paga se divide entre Google e criativo próprio pelos pesos', () => {
    const n = 30_000;
    const t = tally([paid('a'), google, casa], n);
    expect(Math.abs(t.a / n - 0.7)).toBeLessThan(0.02);
    expect(Math.abs(t.google / n - 0.2)).toBeLessThan(0.02); // 30% × 100/150
    expect(Math.abs(t.casa / n - 0.1)).toBeLessThan(0.02); // 30% × 50/150
  });

  it('sem pago: Google e/ou criativo próprio preenchem, pelo peso (comportamento antigo)', () => {
    const n = 20_000;
    const t = tally([google, casa], n);
    expect(Math.abs(t.google / n - 2 / 3)).toBeLessThan(0.02);
    expect(Math.abs(t.casa / n - 1 / 3)).toBeLessThan(0.02);
    expect(tally([google], 100)).toEqual({ google: 100 });
  });

  it('só pago (sem Google nem próprio): sempre um pago, em rodízio', () => {
    const t = tally([paid('a'), paid('b')], 2000);
    expect(t.google).toBeUndefined();
    expect(t.a + t.b).toBe(2000);
    expect(Math.abs(t.a / 2000 - 0.5)).toBeLessThan(0.05);
  });

  it('paidShare 0 = nunca pago se houver alternativa; 1 = sempre pago', () => {
    expect(tally([paid('a'), google], 500, 0)).toEqual({ google: 500 });
    expect(tally([paid('a'), google], 500, 1)).toEqual({ a: 500 });
  });

  it('lista vazia → null; paidShare inválido cai no padrão', () => {
    expect(pickAd([])).toBeNull();
    expect(normalizePaidShare(Number.NaN)).toBe(DEFAULT_PAID_SHARE);
    expect(normalizePaidShare('0.4')).toBe(DEFAULT_PAID_SHARE);
    expect(normalizePaidShare(2)).toBe(1);
    expect(normalizePaidShare(-1)).toBe(0);
  });
});
