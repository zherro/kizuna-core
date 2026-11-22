import { describe, expect, it } from 'vitest';
import { resourceMarketing } from './marketing';

describe('resourceMarketing', () => {
  it('PATCH de parar manda só stopped_on (grant por coluna no banco)', () => {
    expect(resourceMarketing.boosts.mapInput!({ stoppedOn: '2026-12-01' })).toEqual({ stopped_on: '2026-12-01' });
    expect(resourceMarketing.ad_campaigns.mapInput!({ stoppedOn: '2026-12-01' })).toEqual({ stopped_on: '2026-12-01' });
  });

  it('criar boost mapeia os campos e não aceita tenant/criador do cliente', () => {
    const out = resourceMarketing.boosts.mapInput!({
      serviceUid: 'u', dailyCents: 1500, startsOn: '2026-12-01', endsOn: '2026-12-07',
      tenantId: 'outro', createdBy: 'outro',
    });
    expect(out).toEqual({ service_uid: 'u', daily_cents: 1500, starts_on: '2026-12-01', ends_on: '2026-12-07' });
  });

  it('crédito de admin arredonda para centavos inteiros e limita a nota', () => {
    const out = resourceMarketing.wallet_ledger.mapInput!({ tenantId: 't', amountCents: 1000.4, note: 'x'.repeat(500) });
    expect(out.amount_cents).toBe(1000);
    expect(out.kind).toBe('credit_admin');
    expect(String(out.note)).toHaveLength(300);
  });

  it('banner do anunciante nasce inativo e com peso 1, mesmo que o cliente mande outra coisa', () => {
    const out = resourceMarketing.ad_creatives_mine.mapInput!({
      id: 'c', tenantId: 't', format: 'banner', kind: 'gif', imageUrl: '/a.gif', linkUrl: 'https://x.com',
      active: true, weight: 900, slots: ['cidade-topo'],
    });
    expect(out).toMatchObject({ active: false, weight: 1, id: 'c', tenant_id: 't' });
  });

  it('visões públicas expõem só o uid do anúncio (sem valores) e listam sem login', () => {
    const c = resourceMarketing.vw_boosts_live;
    expect(c.listRequiresAuth).toBe(false);
    expect(c.select).toBe('service_uid');
    expect(c.publicCacheSeconds).toBeUndefined();
  });

  it('campanhas no ar: só criativo e espaço, público e sem cache', () => {
    const c = resourceMarketing.vw_ad_campaigns_live;
    expect(c.listRequiresAuth).toBe(false);
    expect(c.select).toBe('creative_id,slot_slug');
    expect(c.mapOutput!({ creative_id: 'c1', slot_slug: 'home-meio' })).toEqual({ creativeId: 'c1', slotSlug: 'home-meio' });
  });

  it('nenhum recurso do marketing liga cache de servidor', () => {
    for (const cfg of Object.values(resourceMarketing)) expect(cfg.publicCacheSeconds).toBeUndefined();
  });
  it('crédito de admin só manda ref_id quando vier', () => {
    expect(resourceMarketing.wallet_ledger.mapInput!({ tenantId: 't', amountCents: 100 })).not.toHaveProperty('ref_id');
    expect(resourceMarketing.wallet_ledger.mapInput!({ tenantId: 't', amountCents: 100, refId: 'pay-1' })).toMatchObject({ ref_id: 'pay-1' });
  });

  it('extrato completo é só leitura e devolve camelCase', () => {
    const c = resourceMarketing.vw_wallet_statement;
    expect(c.table).toBe('vw_wallet_statement');
    expect(c.primaryKey).toBe('entry_id');
    expect(c.defaultOrder).toBe('occurred_at');
    expect(c.mapInput).toBeUndefined();
    expect(c.select).toBe('tenant_id,entry_id,kind,amount_cents,note,ref_id,service_uid,service_title,slot_slug,days,occurred_at');
    expect(
      c.mapOutput!({
        tenant_id: 't', entry_id: 'B:9', kind: 'boost', amount_cents: '-3000', note: null, ref_id: 9,
        service_uid: 'u1', service_title: 'Bar', slot_slug: null, days: '3', occurred_at: '2026-11-01T00:00:00Z',
      }),
    ).toEqual({
      id: 'B:9', tenantId: 't', kind: 'boost', amountCents: -3000, note: '', refId: '9',
      serviceUid: 'u1', serviceTitle: 'Bar', slotSlug: null, days: 3, occurredAt: '2026-11-01T00:00:00Z',
    });
  });
});
