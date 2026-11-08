import { describe, expect, it, vi } from 'vitest';
import { parseTopupAmount } from './handlers';
import { __resetPaymentProviders, defaultProviderId, getPaymentProvider, registerPaymentProvider } from './registry';
import { settlePayment } from './settle';
import type { ServiceDb } from '../../service-db';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function fakeDb(handler: (path: string, init?: RequestInit) => Response) {
  const calls: Array<{ path: string; init?: RequestInit }> = [];
  const table = vi.fn(async (path: string, init?: RequestInit) => {
    calls.push({ path, init });
    return handler(path, init);
  });
  return { db: { table, rpc: vi.fn() } as unknown as ServiceDb, calls };
}

const intent = { id: 'i1', tenant_id: 't1', amount_cents: 5000, provider: 'x', external_id: 'e1', status: 'pending' };

describe('parseTopupAmount', () => {
  it('aceita inteiros dentro da faixa e recusa o resto', () => {
    expect(parseTopupAmount({ amountCents: 5000 })).toBe(5000);
    expect(parseTopupAmount({ amountCents: '5000' })).toBe(5000);
    expect(parseTopupAmount({ amountCents: 999 })).toBeNull();
    expect(parseTopupAmount({ amountCents: 10.5 })).toBeNull();
    expect(parseTopupAmount({ amountCents: 1e12 })).toBeNull();
    expect(parseTopupAmount(null)).toBeNull();
  });
});

describe('registry', () => {
  it('padrão é o manual; provedor registrado vira padrão por env', () => {
    __resetPaymentProviders();
    expect(defaultProviderId()).toBe('manual');
    registerPaymentProvider({ id: 'pay', createCheckout: async () => ({}), verifyWebhook: async () => null });
    process.env.MARKETING_PAYMENT_PROVIDER = 'pay';
    expect(defaultProviderId()).toBe('pay');
    expect(getPaymentProvider('pay')?.id).toBe('pay');
    delete process.env.MARKETING_PAYMENT_PROVIDER;
    expect(() => registerPaymentProvider({ id: 'Ruim Id', createCheckout: async () => ({}), verifyWebhook: async () => null })).toThrow();
  });
});

describe('settlePayment', () => {
  it('credita uma vez e marca pago', async () => {
    const { db, calls } = fakeDb((path, init) => {
      if (path.startsWith('/payment_intents?provider')) return json([intent]);
      if (path === '/wallet_ledger') return json({}, 201);
      return json({});
    });
    const r = await settlePayment(db, 'x', { externalId: 'e1', status: 'paid', amountCents: 5000 });
    expect(r).toEqual({ ok: true, credited: true });
    const credit = calls.find((c) => c.path === '/wallet_ledger')!;
    expect(JSON.parse(String(credit.init?.body))).toMatchObject({ kind: 'credit_payment', amount_cents: 5000, ref_id: 'i1', tenant_id: 't1' });
    expect(calls.some((c) => c.path === '/payment_intents?id=eq.i1' && String(c.init?.body).includes('paid'))).toBe(true);
  });

  it('webhook reentregue (409 no livro-razão) não credita de novo mas conclui', async () => {
    const { db } = fakeDb((path) => {
      if (path.startsWith('/payment_intents?provider')) return json([intent]);
      if (path === '/wallet_ledger') return json({ code: '23505' }, 409);
      return json({});
    });
    expect(await settlePayment(db, 'x', { externalId: 'e1', status: 'paid' })).toEqual({ ok: true, credited: false });
  });

  it('valor divergente não credita', async () => {
    const { db, calls } = fakeDb((path) => (path.startsWith('/payment_intents?provider') ? json([intent]) : json({})));
    expect(await settlePayment(db, 'x', { externalId: 'e1', status: 'paid', amountCents: 1 })).toEqual({ ok: false, reason: 'amount_mismatch' });
    expect(calls.some((c) => c.path === '/wallet_ledger')).toBe(false);
  });

  it('intent desconhecida → not_found; falha do banco no crédito → error (provedor reentrega)', async () => {
    const none = fakeDb(() => json([]));
    expect(await settlePayment(none.db, 'x', { externalId: 'zz', status: 'paid' })).toEqual({ ok: false, reason: 'not_found' });
    const boom = fakeDb((path) => (path.startsWith('/payment_intents?provider') ? json([intent]) : json({}, 500)));
    expect(await settlePayment(boom.db, 'x', { externalId: 'e1', status: 'paid' })).toEqual({ ok: false, reason: 'error' });
  });

  it('falha/expiração só atualiza o status pendente, sem crédito', async () => {
    const { db, calls } = fakeDb((path) => (path.startsWith('/payment_intents?provider') ? json([intent]) : json({})));
    expect(await settlePayment(db, 'x', { externalId: 'e1', status: 'failed' })).toEqual({ ok: true, credited: false });
    expect(calls.some((c) => c.path === '/wallet_ledger')).toBe(false);
  });
});
