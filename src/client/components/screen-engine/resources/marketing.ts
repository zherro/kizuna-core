import type { ResourceConfig } from '../types/resource-config';

const str = (v: unknown): string => (v == null ? '' : String(v));
const num = (v: unknown): number => Number(v ?? 0);

/** Só copia as chaves que vieram: o PATCH "parar" manda apenas `stoppedOn` (grant por coluna). */
function pick(i: Record<string, unknown>, map: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [from, to] of Object.entries(map)) {
    if (i[from] !== undefined) out[to] = i[from] === '' ? null : i[from];
  }
  return out;
}

/**
 * Plugin `marketing`. Spread em `postgrestResources` do projeto. Valores em CENTAVOS.
 *
 * Nenhuma listagem é pública nem cacheada: saldo, impulsionamentos e campanhas são do anunciante
 * (RLS por `tenant_id`; `marketing/manage` vê tudo). O que o público enxerga (selo e banner pago)
 * vem das views `vw_boosts_live` / `vw_ad_campaigns_live`, sem valores, e SEMPRE sem cache.
 */
export const resourceMarketing: Record<string, ResourceConfig> = {
  wallet_ledger: {
    schema: 'public',
    table: 'wallet_ledger',
    select: 'id,tenant_id,kind,amount_cents,note,ref_id,created_by,created_at',
    primaryKey: 'id',
    defaultOrder: 'created_at',
    searchableColumns: ['note'],
    maxPageSize: 200,
    // Crédito de admin: só `marketing/manage` passa na RLS. Sem UPDATE/DELETE (livro-razão).
    mapInput: (i) => ({
      tenant_id: i.tenantId,
      kind: i.kind ?? 'credit_admin',
      amount_cents: Math.round(num(i.amountCents)),
      note: str(i.note).slice(0, 300),
    }),
    mapOutput: (r) => ({
      id: String(r.id ?? ''),
      tenantId: str(r.tenant_id),
      kind: str(r.kind),
      amountCents: num(r.amount_cents),
      note: str(r.note),
      createdBy: r.created_by ? str(r.created_by) : null,
      createdAt: str(r.created_at),
    }),
  },
  vw_wallet_balance: {
    schema: 'public',
    table: 'vw_wallet_balance',
    select: 'tenant_id,balance_cents,credited_cents,committed_cents',
    primaryKey: 'tenant_id',
    defaultOrder: 'tenant_id',
    searchableColumns: [],
    maxPageSize: 500,
    mapOutput: (r) => ({
      tenantId: str(r.tenant_id),
      balanceCents: num(r.balance_cents),
      creditedCents: num(r.credited_cents),
      committedCents: num(r.committed_cents),
    }),
  },
  boosts: {
    schema: 'public',
    table: 'boosts',
    select: 'id,service_uid,tenant_id,daily_cents,starts_on,ends_on,stopped_on,created_at',
    primaryKey: 'id',
    defaultOrder: 'starts_on',
    searchableColumns: [],
    maxPageSize: 200,
    mapInput: (i) =>
      pick(i, {
        serviceUid: 'service_uid',
        dailyCents: 'daily_cents',
        startsOn: 'starts_on',
        endsOn: 'ends_on',
        stoppedOn: 'stopped_on',
      }),
    mapOutput: (r) => ({
      id: String(r.id ?? ''),
      serviceUid: str(r.service_uid),
      tenantId: str(r.tenant_id),
      dailyCents: num(r.daily_cents),
      startsOn: str(r.starts_on),
      endsOn: str(r.ends_on),
      stoppedOn: r.stopped_on ? str(r.stopped_on) : null,
      createdAt: str(r.created_at),
    }),
  },
  ad_campaigns: {
    schema: 'public',
    table: 'ad_campaigns',
    select: 'id,creative_id,slot_slug,tenant_id,daily_cents,starts_on,ends_on,stopped_on,created_at',
    primaryKey: 'id',
    defaultOrder: 'starts_on',
    searchableColumns: [],
    maxPageSize: 200,
    mapInput: (i) =>
      pick(i, {
        creativeId: 'creative_id',
        slotSlug: 'slot_slug',
        dailyCents: 'daily_cents',
        startsOn: 'starts_on',
        endsOn: 'ends_on',
        stoppedOn: 'stopped_on',
      }),
    mapOutput: (r) => ({
      id: String(r.id ?? ''),
      creativeId: str(r.creative_id),
      slotSlug: str(r.slot_slug),
      tenantId: str(r.tenant_id),
      dailyCents: num(r.daily_cents),
      startsOn: str(r.starts_on),
      endsOn: str(r.ends_on),
      stoppedOn: r.stopped_on ? str(r.stopped_on) : null,
      createdAt: str(r.created_at),
    }),
  },
  // Envio de banner pelo anunciante: INSERT em ad_creatives sempre inativo, peso 1 e sem janela
  // (a RLS exige). O `id` vem do cliente para a campanha poder referenciá-lo. Só criação.
  ad_creatives_mine: {
    schema: 'public',
    table: 'ad_creatives',
    select: 'id',
    primaryKey: 'id',
    defaultOrder: 'created_at',
    searchableColumns: [],
    mapInput: (i) => ({
      id: i.id,
      tenant_id: i.tenantId,
      format: i.format,
      kind: i.kind,
      image_url: i.imageUrl,
      alt: str(i.alt).slice(0, 200),
      link_url: i.linkUrl,
      label: str(i.label).slice(0, 80),
      slots: i.slots ?? [],
      active: false,
      weight: 1,
    }),
    mapOutput: (r) => ({ id: String(r.id ?? '') }),
  },
  // Painel do anunciante: seus banners + situação da revisão (view; ver vw_my_ad_creatives).
  my_ad_creatives: {
    schema: 'public',
    table: 'vw_my_ad_creatives',
    select: 'id,tenant_id,format,kind,image_url,alt,link_url,label,slots,active,created_at,review_status,review_reason',
    primaryKey: 'id',
    defaultOrder: 'created_at',
    searchableColumns: ['label'],
    maxPageSize: 200,
    mapOutput: (r) => ({
      id: String(r.id ?? ''),
      tenantId: str(r.tenant_id),
      format: str(r.format),
      kind: str(r.kind),
      imageUrl: str(r.image_url),
      alt: str(r.alt),
      linkUrl: str(r.link_url),
      label: str(r.label),
      slots: Array.isArray(r.slots) ? r.slots.map(String) : [],
      active: Boolean(r.active),
      createdAt: str(r.created_at),
      reviewStatus: str(r.review_status),
      reviewReason: str(r.review_reason),
    }),
  },
  ad_creative_reviews: {
    schema: 'public',
    table: 'ad_creative_reviews',
    select: 'creative_id,status,reason,reviewed_at',
    primaryKey: 'creative_id',
    defaultOrder: 'reviewed_at',
    searchableColumns: [],
    upsertOn: 'creative_id',
    maxPageSize: 500,
    mapInput: (i) => ({
      creative_id: i.creativeId,
      status: i.status,
      reason: str(i.reason).slice(0, 300),
      reviewed_at: new Date().toISOString(),
    }),
    mapOutput: (r) => ({
      creativeId: str(r.creative_id),
      status: str(r.status),
      reason: str(r.reason),
      reviewedAt: str(r.reviewed_at),
    }),
  },
  payment_intents: {
    schema: 'public',
    table: 'payment_intents',
    select: 'id,tenant_id,amount_cents,provider,external_id,status,created_at',
    primaryKey: 'id',
    defaultOrder: 'created_at',
    searchableColumns: [],
    maxPageSize: 100,
    mapInput: (i) => ({
      amount_cents: Math.round(num(i.amountCents)),
      provider: str(i.provider) || 'manual',
    }),
    mapOutput: (r) => ({
      id: String(r.id ?? ''),
      tenantId: str(r.tenant_id),
      amountCents: num(r.amount_cents),
      provider: str(r.provider),
      status: str(r.status),
      createdAt: str(r.created_at),
    }),
  },
  // Projeções públicas (sem valores). Lidas pelo navegador SEM cache — ver `fetchLive` em client/marketing.
  vw_boosts_live: {
    schema: 'public',
    table: 'vw_boosts_live',
    select: 'service_uid',
    primaryKey: 'service_uid',
    defaultOrder: 'service_uid',
    searchableColumns: [],
    listRequiresAuth: false,
    maxPageSize: 1000,
    returnCountPreferDisabled: true,
    mapOutput: (r) => ({ serviceUid: str(r.service_uid) }),
  },
  vw_boost_metrics_daily: {
    schema: 'public',
    table: 'vw_boost_metrics_daily',
    select: 'boost_id,tenant_id,service_uid,day,impressions,views,contact_clicks,interactions',
    primaryKey: 'boost_id',
    defaultOrder: 'day',
    searchableColumns: [],
    maxPageSize: 1000,
    returnCountPreferDisabled: true,
    mapOutput: (r) => ({
      boostId: str(r.boost_id),
      tenantId: str(r.tenant_id),
      serviceUid: str(r.service_uid),
      day: str(r.day),
      impressions: num(r.impressions),
      views: num(r.views),
      contactClicks: num(r.contact_clicks),
      interactions: num(r.interactions),
    }),
  },
  vw_ad_delivery_daily: {
    schema: 'public',
    table: 'vw_ad_delivery_daily',
    select: 'campaign_id,tenant_id,creative_id,slot_slug,day,impressions,clicks',
    primaryKey: 'campaign_id',
    defaultOrder: 'day',
    searchableColumns: [],
    maxPageSize: 1000,
    returnCountPreferDisabled: true,
    mapOutput: (r) => ({
      campaignId: str(r.campaign_id),
      tenantId: str(r.tenant_id),
      creativeId: str(r.creative_id),
      slotSlug: str(r.slot_slug),
      day: str(r.day),
      impressions: num(r.impressions),
      clicks: num(r.clicks),
    }),
  },
};
