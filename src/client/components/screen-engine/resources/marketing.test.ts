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

  it('nenhum recurso do marketing liga cache de servidor', () => {
    for (const cfg of Object.values(resourceMarketing)) expect(cfg.publicCacheSeconds).toBeUndefined();
  });
});
