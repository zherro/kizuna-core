import type { RpcConfig } from '@kizuna/core/types';
import type { ResourceConfig } from '../types/resource-config';

const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
const str = (v: unknown): string | null => (v == null ? null : String(v));

/**
 * Plugin `ads`. Spread em `postgrestResources` / `postgrestRpcs` do projeto.
 * Leitura de slots e criativos é pública (RLS filtra habilitado/vigente); escrita exige `ads/manage`.
 */
export const resourceAds: Record<string, ResourceConfig> = {
  ad_slots: {
    schema: 'public',
    table: 'ad_slots',
    select: 'slug,enabled,media,google_weight,google_ad_unit,rotate_seconds',
    primaryKey: 'slug',
    defaultOrder: 'slug',
    searchableColumns: [],
    listRequiresAuth: false,
    upsertOn: 'slug',
    maxPageSize: 100,
    mapInput: (i) => ({
      slug: i.slug,
      enabled: i.enabled,
      media: i.media,
      google_weight: i.googleWeight,
      google_ad_unit: i.googleAdUnit || null,
      rotate_seconds: i.rotateSeconds,
      updated_at: new Date().toISOString(),
    }),
    mapOutput: (r) => ({
      slug: String(r.slug ?? ''),
      enabled: Boolean(r.enabled),
      media: arr(r.media),
      googleWeight: Number(r.google_weight ?? 0),
      googleAdUnit: str(r.google_ad_unit),
      rotateSeconds: Number(r.rotate_seconds ?? 0),
    }),
  },
  ad_creatives: {
    schema: 'public',
    table: 'ad_creatives',
    select: 'id,format,kind,image_url,alt,link_url,label,weight,starts_at,ends_at,cities,slots,active',
    primaryKey: 'id',
    defaultOrder: 'created_at',
    searchableColumns: ['label'],
    listRequiresAuth: false,
    maxPageSize: 200,
    mapInput: (i) => ({
      format: i.format,
      kind: i.kind,
      image_url: i.imageUrl,
      alt: i.alt ?? '',
      link_url: i.linkUrl,
      label: i.label ?? '',
      weight: i.weight,
      starts_at: i.startsAt || null,
      ends_at: i.endsAt || null,
      cities: i.cities ?? [],
      slots: i.slots ?? [],
      active: i.active,
      updated_at: new Date().toISOString(),
    }),
    mapOutput: (r) => ({
      id: String(r.id ?? ''),
      format: String(r.format ?? ''),
      kind: String(r.kind ?? ''),
      imageUrl: String(r.image_url ?? ''),
      alt: String(r.alt ?? ''),
      linkUrl: String(r.link_url ?? ''),
      label: String(r.label ?? ''),
      weight: Number(r.weight ?? 0),
      startsAt: str(r.starts_at),
      endsAt: str(r.ends_at),
      cities: arr(r.cities),
      slots: arr(r.slots),
      active: Boolean(r.active),
    }),
  },
  ad_stats_daily: {
    schema: 'public',
    table: 'ad_stats_daily',
    select: 'id,slot_slug,creative_id,page,day,impressions,clicks',
    primaryKey: 'id',
    defaultOrder: 'id',
    searchableColumns: [],
    maxPageSize: 1000,
    returnCountPreferDisabled: true,
  },
};

export const rpcAds: Record<string, RpcConfig> = {
  fn_ad_track: { schema: 'public', requiresAuth: false, optionalAuth: true },
};
