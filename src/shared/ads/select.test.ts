import { describe, expect, it } from 'vitest';
import { buildCandidates, isVigente, pickWeighted } from './select';
import type { AdCreative, AdSlotConfig } from './types';

const slot: AdSlotConfig = {
  slug: 'home-meio', enabled: true, media: ['imagem', 'gif', 'google'],
  googleWeight: 2, googleAdUnit: '123', rotateSeconds: 0,
};
const mk = (o: Partial<AdCreative> = {}): AdCreative => ({
  id: 'c1', format: 'banner', kind: 'imagem', imageUrl: '/a.webp', alt: 'a', linkUrl: 'https://x.com',
  label: 'X', weight: 1, startsAt: null, endsAt: null, cities: [], slots: [], active: true, ...o,
});
const now = new Date('2026-10-13T12:00:00Z');

describe('isVigente', () => {
  it('rejeita inativo, futuro e vencido', () => {
    expect(isVigente(mk({ active: false }), now)).toBe(false);
    expect(isVigente(mk({ startsAt: '2026-10-14T00:00:00Z' }), now)).toBe(false);
    expect(isVigente(mk({ endsAt: '2026-10-12T00:00:00Z' }), now)).toBe(false);
    expect(isVigente(mk({ startsAt: '2026-10-01T00:00:00Z', endsAt: '2026-10-30T00:00:00Z' }), now)).toBe(true);
  });
});

describe('isVigente — bordas', () => {
  it('now === startsAt e now === endsAt são vigentes', () => {
    expect(isVigente(mk({ startsAt: now.toISOString() }), now)).toBe(true);
    expect(isVigente(mk({ endsAt: now.toISOString() }), now)).toBe(true);
  });
  it('data inválida não é vigente', () => {
    expect(isVigente(mk({ startsAt: 'lixo' }), now)).toBe(false);
    expect(isVigente(mk({ endsAt: 'lixo' }), now)).toBe(false);
  });
});

describe('buildCandidates — normalização de cidade', () => {
  const base = { slot, format: 'banner' as const, now, googleReady: false };
  const ids = (city: string) =>
    buildCandidates({ ...base, city, creatives: [mk({ cities: ['Cuiabá'] })] }).length;
  it('ignora caixa e espaços nas pontas, mas acento diferente continua distinto', () => {
    expect(ids(' cuiabá ')).toBe(1);
    expect(ids('Cuiabá')).toBe(1);
    expect(ids('cuiaba')).toBe(0); // sem acento NÃO casa (comportamento documentado)
  });
});

describe('buildCandidates', () => {
  const base = { slot, format: 'banner' as const, now, googleReady: true };
  it('filtra por formato, kind aceito, restrição de slot e cidade', () => {
    const creatives = [
      mk({ id: 'ok' }),
      mk({ id: 'outro-formato', format: 'card' }),
      mk({ id: 'outro-slot', slots: ['cidade-topo'] }),
      mk({ id: 'so-cuiaba', cities: ['Cuiabá'] }),
    ];
    const ids = buildCandidates({ ...base, creatives, city: 'Cuiabá' })
      .flatMap((c) => (c.type === 'own' ? [c.creative.id] : []));
    expect(ids).toEqual(['ok', 'so-cuiaba']);
  });
  it('cidade desconhecida exclui criativo restrito a cidade', () => {
    const r = buildCandidates({ ...base, creatives: [mk({ cities: ['Cuiabá'] })], city: null });
    expect(r.some((c) => c.type === 'own')).toBe(false);
  });
  it('respeita media do slot (sem gif) e Google desligado', () => {
    const s = { ...slot, media: ['imagem'] as AdSlotConfig['media'] };
    const r = buildCandidates({ ...base, slot: s, creatives: [mk({ kind: 'gif' })] });
    expect(r).toEqual([]);
  });
  it('inclui Google só com peso, media e googleReady', () => {
    expect(buildCandidates({ ...base, creatives: [] })).toEqual([{ type: 'google', adUnit: '123', weight: 2 }]);
    expect(buildCandidates({ ...base, creatives: [], googleReady: false })).toEqual([]);
    expect(buildCandidates({ ...base, slot: { ...slot, googleWeight: 0 }, creatives: [] })).toEqual([]);
  });
  it('descarta URLs inseguras e aceita relativa/http(s)', () => {
    const ids = buildCandidates({
      ...base, slot: { ...slot, googleWeight: 0 },
      creatives: [
        mk({ id: 'js', linkUrl: 'javascript:alert(1)' }),
        mk({ id: 'data-link', linkUrl: 'data:text/html,x' }),
        mk({ id: 'data-img', imageUrl: 'data:image/png;base64,AAA' }),
        mk({ id: 'proto', imageUrl: '//evil.com/a.png' }),
        mk({ id: 'rel', imageUrl: '/uploads/a.png' }),
        mk({ id: 'abs', imageUrl: 'https://cdn.x/a.png' }),
      ],
    }).flatMap((c) => (c.type === 'own' ? [c.creative.id] : []));
    expect(ids).toEqual(['rel', 'abs']);
  });
  it('descarta peso zero', () => {
    expect(buildCandidates({ ...base, slot: { ...slot, googleWeight: 0 }, creatives: [mk({ weight: 0 })] })).toEqual([]);
  });
});

describe('pickWeighted', () => {
  const a = { type: 'google', adUnit: '1', weight: 1 } as const;
  const b = { type: 'own', creative: mk({ id: 'b' }), weight: 3 } as const;
  it('lista vazia ou pesos inválidos → null', () => {
    expect(pickWeighted([])).toBeNull();
    expect(pickWeighted([{ ...a, weight: 0 }, { ...a, weight: -2 }])).toBeNull();
  });
  it('respeita faixas de peso', () => {
    expect(pickWeighted([a, b], () => 0)).toBe(a);
    expect(pickWeighted([a, b], () => 0.24)).toBe(a);
    expect(pickWeighted([a, b], () => 0.25)).toBe(b);
    expect(pickWeighted([a, b], () => 0.999)).toBe(b);
  });
});
