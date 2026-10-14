import { describe, expect, it } from 'vitest';
import { resourceAds, rpcAds } from './ads';

describe('resourceAds', () => {
  it('ad_slots mapeia para AdSlotConfig e lista sem login', () => {
    const c = resourceAds.ad_slots;
    expect(c.listRequiresAuth).toBe(false);
    expect(c.upsertOn).toBe('slug');
    expect(c.mapOutput!({
      slug: 'home-meio', enabled: true, media: ['imagem'], google_weight: 2, google_ad_unit: '9', rotate_seconds: 0,
    })).toEqual({
      slug: 'home-meio', enabled: true, media: ['imagem'], googleWeight: 2, googleAdUnit: '9', rotateSeconds: 0,
    });
  });
  it('ad_creatives mapeia entrada e saída', () => {
    const c = resourceAds.ad_creatives;
    expect(c.mapInput!({ imageUrl: '/a', linkUrl: 'https://x.com', startsAt: null, endsAt: null, format: 'card', kind: 'gif' }))
      .toMatchObject({ image_url: '/a', link_url: 'https://x.com', format: 'card', kind: 'gif' });
    expect(c.mapOutput!({
      id: 'u', format: 'card', kind: 'gif', image_url: '/a', alt: '', link_url: 'https://x.com', label: 'L',
      weight: 1, starts_at: null, ends_at: null, cities: [], slots: [], active: true,
    })).toMatchObject({ id: 'u', imageUrl: '/a', linkUrl: 'https://x.com' });
  });
  it('ad_stats_daily usa id como chave estável de paginação', () => {
    expect(resourceAds.ad_stats_daily.primaryKey).toBe('id');
    expect(resourceAds.ad_stats_daily.defaultOrder).toBe('id');
    expect(resourceAds.ad_stats_daily.select).toContain('id');
  });
  it('fn_ad_track é pública', () => {
    expect(rpcAds.fn_ad_track.requiresAuth).toBe(false);
  });
});
