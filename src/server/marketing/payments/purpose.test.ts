import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ServiceDb } from '../../service-db';
import { devPaymentProvider } from './dev';
import { fulfillPurpose, parsePurpose, planPurpose, type Purpose } from './purpose';
import { settlePayment } from './settle';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const U = '11111111-1111-4111-8111-111111111111';
const C = '22222222-2222-4222-8222-222222222222';
const I = '33333333-3333-4333-8333-333333333333';
const owner = { tenantId: 't1', userId: 'u1' };
const TODAY = '2026-11-20';

type Handler = (path: string, init?: RequestInit) => Response | undefined;
function fakeDb(handler: Handler) {
  const calls: Array<{ path: string; init?: RequestInit }> = [];
  const table = vi.fn(async (path: string, init?: RequestInit) => {
    calls.push({ path, init });
    return handler(path, init) ?? json([]);
  });
  return { db: { table, rpc: vi.fn() } as unknown as ServiceDb, calls };
}

const boost: Purpose = { kind: 'boost', serviceUid: U, dailyCents: 1000, startsOn: TODAY, days: 3 };
const campaign: Purpose = { kind: 'campaign', creativeId: C, slotSlug: 'home-topo', dailyCents: 2000, startsOn: TODAY, days: 5 };
const activeService = (path: string) =>
  path.startsWith('/services?') ? json([{ created_by: 'u1', active: true, status: 'active' }]) : undefined;

describe('parsePurpose', () => {
  it('aceita boost/campanha válidos e recusa o resto', () => {
    expect(parsePurpose(boost)).toEqual(boost);
    expect(parsePurpose(campaign)).toEqual(campaign);
    expect(parsePurpose({ ...boost, dailyCents: 499 })).toBeNull();
    expect(parsePurpose({ ...boost, days: 91 })).toBeNull();
    expect(parsePurpose({ ...boost, serviceUid: 'x' })).toBeNull();
    expect(parsePurpose({ ...campaign, slotSlug: 'Com Espaço' })).toBeNull();
    expect(parsePurpose({ ...boost, kind: 'outro' })).toBeNull();
    expect(parsePurpose(null)).toBeNull();
  });
});

describe('planPurpose', () => {
  it('boost: dono + anúncio publicado; data passada vira hoje (mesmos dias/valor)', async () => {
    const { db } = fakeDb(activeService);
    expect(await planPurpose(db, owner, { ...boost, startsOn: '2026-11-18' }, TODAY)).toEqual({
      ok: true,
      startsOn: TODAY,
      endsOn: '2026-11-22',
      costCents: 3000,
    });
  });

  it('boost: anúncio de outro usuário ou despublicado é recusado', async () => {
    const other = fakeDb((p) => (p.startsWith('/services?') ? json([{ created_by: 'u9', active: true, status: 'active' }]) : undefined));
    expect(await planPurpose(other.db, owner, boost, TODAY)).toMatchObject({ ok: false });
    const off = fakeDb((p) => (p.startsWith('/services?') ? json([{ created_by: 'u1', active: false, status: 'active' }]) : undefined));
    expect(await planPurpose(off.db, owner, boost, TODAY)).toMatchObject({ ok: false, reason: expect.stringMatching(/publicado/) });
  });

  it('boost: não sobrepõe — começa no dia seguinte ao boost que ainda vale', async () => {
    const { db } = fakeDb((p) => activeService(p) ?? (p.startsWith('/boosts?') ? json([{ ends_on: '2026-11-25' }]) : undefined));
    expect(await planPurpose(db, owner, boost, TODAY)).toMatchObject({ ok: true, startsOn: '2026-11-26', endsOn: '2026-11-28' });
  });

  it('campanha: criativo da conta, no espaço, não reprovado, espaço habilitado', async () => {
    const base: Handler = (p) => {
      if (p.startsWith('/ad_creatives?')) return json([{ tenant_id: 't1', slots: ['home-topo'] }]);
      if (p.startsWith('/ad_slots?')) return json([{ enabled: true }]);
      return undefined;
    };
    expect(await planPurpose(fakeDb(base).db, owner, campaign, TODAY)).toMatchObject({ ok: true, costCents: 10000 });
    const rejected = fakeDb((p) => (p.startsWith('/ad_creative_reviews?') ? json([{ status: 'rejected' }]) : base(p)));
    expect(await planPurpose(rejected.db, owner, campaign, TODAY)).toMatchObject({ ok: false, reason: expect.stringMatching(/reprovado/) });
    const closed = fakeDb((p) => (p.startsWith('/ad_slots?') ? json([{ enabled: false }]) : base(p)));
    expect(await planPurpose(closed.db, owner, campaign, TODAY)).toMatchObject({ ok: false });
    const foreign = fakeDb((p) => (p.startsWith('/ad_creatives?') ? json([{ tenant_id: 't2', slots: ['home-topo'] }]) : base(p)));
    expect(await planPurpose(foreign.db, owner, campaign, TODAY)).toMatchObject({ ok: false });
  });

  it('falha do banco é transitória', async () => {
    const { db } = fakeDb(() => json({}, 500));
    expect(await planPurpose(db, owner, boost, TODAY)).toMatchObject({ ok: false, transient: true });
  });
});

describe('fulfillPurpose', () => {
  const intent = { id: I, tenantId: 't1', createdBy: 'u1' };

  it('cria o boost com payment_intent_id e dados do dono', async () => {
    const { db, calls } = fakeDb((p, init) => {
      if (activeService(p)) return activeService(p);
      if (p.startsWith('/vw_wallet_balance')) return json([{ balance_cents: 3000 }]);
      if (p === '/boosts?select=id' && init?.method === 'POST') return json([{ id: 7 }], 201);
      return undefined;
    });
    expect(await fulfillPurpose(db, intent, boost, TODAY)).toEqual({ ok: true, ref: 'boost:7' });
    const ins = calls.find((c) => c.init?.method === 'POST')!;
    expect(JSON.parse(String(ins.init?.body))).toMatchObject({
      service_uid: U,
      tenant_id: 't1',
      created_by: 'u1',
      daily_cents: 1000,
      starts_on: TODAY,
      ends_on: '2026-11-22',
      payment_intent_id: I,
    });
  });

  it('idempotente: já criado → devolve o mesmo, sem inserir', async () => {
    const { db, calls } = fakeDb((p) => (p.startsWith('/boosts?payment_intent_id') ? json([{ id: 7 }]) : undefined));
    expect(await fulfillPurpose(db, intent, boost, TODAY)).toEqual({ ok: true, ref: 'boost:7' });
    expect(calls.some((c) => c.init?.method === 'POST')).toBe(false);
  });

  it('saldo não cobre → falha permanente (não cria)', async () => {
    const { db, calls } = fakeDb((p) => activeService(p) ?? (p.startsWith('/vw_wallet_balance') ? json([{ balance_cents: 100 }]) : undefined));
    expect(await fulfillPurpose(db, intent, boost, TODAY)).toMatchObject({ ok: false });
    expect(calls.some((c) => c.init?.method === 'POST')).toBe(false);
  });

  it('corrida (23505) devolve o criado pela outra entrega', async () => {
    let lookups = 0;
    const { db } = fakeDb((p, init) => {
      if (p.startsWith('/boosts?payment_intent_id')) return json(lookups++ === 0 ? [] : [{ id: 9 }]);
      if (activeService(p)) return activeService(p);
      if (p.startsWith('/vw_wallet_balance')) return json([{ balance_cents: 3000 }]);
      if (init?.method === 'POST') return json({ code: '23505' }, 409);
      return undefined;
    });
    expect(await fulfillPurpose(db, intent, boost, TODAY)).toEqual({ ok: true, ref: 'boost:9' });
  });
});

describe('settlePayment com propósito', () => {
  const row = { id: I, tenant_id: 't1', amount_cents: 3000, provider: 'x', external_id: 'e1', status: 'pending', created_by: 'u1', purpose: boost, fulfilled_ref: null, fulfill_error: null };

  it('credita, cria o boost e marca pago com fulfilled_ref', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`));
    const { db, calls } = fakeDb((p, init) => {
      if (p.startsWith('/payment_intents?provider')) return json([row]);
      if (p === '/wallet_ledger') return json({}, 201);
      if (activeService(p)) return activeService(p);
      if (p.startsWith('/vw_wallet_balance')) return json([{ balance_cents: 3000 }]);
      if (p === '/boosts?select=id' && init?.method === 'POST') return json([{ id: 5 }], 201);
      return json({});
    });
    expect(await settlePayment(db, 'x', { externalId: 'e1', status: 'paid', amountCents: 3000 })).toEqual({ ok: true, credited: true });
    const patch = calls.find((c) => c.path === `/payment_intents?id=eq.${I}`)!;
    expect(JSON.parse(String(patch.init?.body))).toMatchObject({ status: 'paid', fulfilled_ref: 'boost:5' });
    vi.useRealTimers();
  });

  it('anúncio despublicado: valor fica no saldo (fulfill_error) e o pagamento é concluído', async () => {
    const { db, calls } = fakeDb((p) => {
      if (p.startsWith('/payment_intents?provider')) return json([row]);
      if (p === '/wallet_ledger') return json({}, 201);
      if (p.startsWith('/services?')) return json([{ created_by: 'u1', active: false, status: 'active' }]);
      return json({});
    });
    expect(await settlePayment(db, 'x', { externalId: 'e1', status: 'paid' })).toEqual({ ok: true, credited: true });
    const patch = calls.find((c) => c.path === `/payment_intents?id=eq.${I}`)!;
    expect(JSON.parse(String(patch.init?.body)).fulfill_error).toMatch(/saldo/);
  });

  it('falha transitória ao criar → erro (o provedor reentrega; crédito já é idempotente)', async () => {
    const { db } = fakeDb((p) => {
      if (p.startsWith('/payment_intents?provider')) return json([row]);
      if (p === '/wallet_ledger') return json({}, 201);
      return json({}, 503);
    });
    expect(await settlePayment(db, 'x', { externalId: 'e1', status: 'paid' })).toEqual({ ok: false, reason: 'error' });
  });

  it('já liquidado e criado: não cria de novo nem reescreve', async () => {
    const { db, calls } = fakeDb((p) => {
      if (p.startsWith('/payment_intents?provider')) return json([{ ...row, status: 'paid', fulfilled_ref: 'boost:5' }]);
      if (p === '/wallet_ledger') return json({ code: '23505' }, 409);
      return json({});
    });
    expect(await settlePayment(db, 'x', { externalId: 'e1', status: 'paid' })).toEqual({ ok: true, credited: false });
    expect(calls.some((c) => c.init?.method === 'PATCH' || c.path.startsWith('/boosts'))).toBe(false);
  });

  it('banco sem a 0002 (select com colunas novas dá 400): segue como recarga', async () => {
    const { db } = fakeDb((p) => {
      if (p.startsWith('/payment_intents?provider') && p.includes('purpose')) return json({ code: '42703' }, 400);
      if (p.startsWith('/payment_intents?provider')) return json([{ id: I, tenant_id: 't1', amount_cents: 3000, provider: 'x', external_id: 'e1', status: 'pending' }]);
      if (p === '/wallet_ledger') return json({}, 201);
      return json({});
    });
    expect(await settlePayment(db, 'x', { externalId: 'e1', status: 'paid' })).toEqual({ ok: true, credited: true });
  });
});

describe('provedor dev', () => {
  afterEach(() => {
    delete process.env.MARKETING_DEV_PAYMENTS;
    delete process.env.MARKETING_DEV_PAY_AFTER_SECONDS;
  });

  it('só liga com MARKETING_DEV_PAYMENTS=1 fora de produção e confirma depois do atraso', async () => {
    expect(devPaymentProvider.isConfigured?.()).toBe(false);
    process.env.MARKETING_DEV_PAYMENTS = '1';
    process.env.MARKETING_DEV_PAY_AFTER_SECONDS = '0';
    expect(devPaymentProvider.isConfigured?.()).toBe(true);
    const r = await devPaymentProvider.createCheckout(
      { id: I, tenantId: 't1', amountCents: 3000, provider: 'dev', externalId: null, status: 'pending' },
      { origin: 'http://localhost' },
    );
    expect(r.pix?.brCode).toContain('DEV');
    expect(await devPaymentProvider.checkStatus!(r.externalId!)).toEqual({ externalId: r.externalId, status: 'paid' });
    const env = process.env as Record<string, string | undefined>;
    const prev = env.NODE_ENV;
    env.NODE_ENV = 'production';
    expect(devPaymentProvider.isConfigured?.()).toBe(false);
    env.NODE_ENV = prev;
  });
});
