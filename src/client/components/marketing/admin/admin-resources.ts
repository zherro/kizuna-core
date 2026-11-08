import type { ResourceConfig } from '../../screen-engine/types/resource-config';

const str = (v: unknown): string => (v == null ? '' : String(v));
const num = (v: unknown): number => Number(v ?? 0);
const first = (v: unknown): Record<string, unknown> | null => {
  if (Array.isArray(v)) return (v[0] as Record<string, unknown>) ?? null;
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
};

/**
 * Recursos de LEITURA do painel admin de marketing (embeds e a visão do admin sobre criativos).
 * Complementam `resources/marketing.ts`; o projeto faz spread junto (`src/lib/server/resources.ts`).
 * A escrita continua nos recursos de `marketing.ts` (`boosts`, `ad_campaigns`, `wallet_ledger`,
 * `ad_creative_reviews`); aqui só há o PATCH booleano de `active` do criativo (`toggleFields`).
 */
export const resourceMarketingAdmin: Record<string, ResourceConfig> = {
  // Boosts com o título do anúncio (embed via FK service_uid → services.uid; RLS do admin vale).
  boosts_admin: {
    schema: 'public',
    table: 'boosts',
    select: 'id,service_uid,tenant_id,daily_cents,starts_on,ends_on,stopped_on,created_at,services(title)',
    primaryKey: 'id',
    defaultOrder: 'starts_on',
    searchableColumns: [],
    maxPageSize: 200,
    mapOutput: (r) => ({
      id: str(r.id),
      serviceUid: str(r.service_uid),
      tenantId: str(r.tenant_id),
      dailyCents: num(r.daily_cents),
      startsOn: str(r.starts_on),
      endsOn: str(r.ends_on),
      stoppedOn: r.stopped_on ? str(r.stopped_on) : null,
      createdAt: str(r.created_at),
      title: str(first(r.services)?.title),
    }),
  },
  // Campanhas de banner com o criativo (embed via FK creative_id → ad_creatives.id).
  ad_campaigns_admin: {
    schema: 'public',
    table: 'ad_campaigns',
    select:
      'id,creative_id,slot_slug,tenant_id,daily_cents,starts_on,ends_on,stopped_on,created_at,ad_creatives(label,alt,image_url,format,kind)',
    primaryKey: 'id',
    defaultOrder: 'starts_on',
    searchableColumns: [],
    maxPageSize: 200,
    mapOutput: (r) => {
      const c = first(r.ad_creatives);
      return {
        id: str(r.id),
        creativeId: str(r.creative_id),
        slotSlug: str(r.slot_slug),
        tenantId: str(r.tenant_id),
        dailyCents: num(r.daily_cents),
        startsOn: str(r.starts_on),
        endsOn: str(r.ends_on),
        stoppedOn: r.stopped_on ? str(r.stopped_on) : null,
        createdAt: str(r.created_at),
        label: str(c?.label) || str(c?.alt),
        imageUrl: str(c?.image_url),
        format: str(c?.format),
        kind: str(c?.kind),
      };
    },
  },
  // Criativos vistos pelo admin: inclui `tenant_id` (NULL = criativo do próprio site). O PATCH só
  // aceita `{ active: boolean }` (toggleFields): a aprovação liga/desliga sem reescrever o registro.
  ad_creatives_review: {
    schema: 'public',
    table: 'ad_creatives',
    select: 'id,tenant_id,created_by,format,kind,image_url,alt,link_url,label,slots,active,created_at',
    primaryKey: 'id',
    defaultOrder: 'created_at',
    searchableColumns: ['label'],
    maxPageSize: 200,
    toggleFields: ['active'],
    mapOutput: (r) => ({
      id: str(r.id),
      tenantId: r.tenant_id ? str(r.tenant_id) : null,
      createdBy: r.created_by ? str(r.created_by) : null,
      format: str(r.format),
      kind: str(r.kind),
      imageUrl: str(r.image_url),
      alt: str(r.alt),
      linkUrl: str(r.link_url),
      label: str(r.label),
      slots: Array.isArray(r.slots) ? r.slots.map(String) : [],
      active: Boolean(r.active),
      createdAt: str(r.created_at),
    }),
  },
  // Achar a conta de um anunciante pelo título do anúncio (o admin não lê `user_data` de ninguém).
  advertiser_services: {
    schema: 'public',
    table: 'services',
    select: 'uid,title,tenant_id,status',
    primaryKey: 'uid',
    defaultOrder: 'title',
    searchableColumns: ['title'],
    maxPageSize: 50,
    returnCountPreferDisabled: true,
    mapOutput: (r) => ({
      uid: str(r.uid),
      title: str(r.title),
      tenantId: str(r.tenant_id),
      status: str(r.status),
    }),
  },
};
