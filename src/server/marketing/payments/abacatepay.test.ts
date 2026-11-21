import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ABACATEPAY_SIGNATURE_KEY, abacatePayProvider } from './abacatepay';
import { reconcilePending } from './handlers';
import { __resetPaymentProviders, defaultProviderId, getPaymentProvider } from './registry';
import type { ServiceDb } from '../../service-db';
import type { PaymentIntent } from './types';

const SECRET = 'whsec_teste_0123456789abcdefghijklmnopqrstuv'; // >= 32 chars, só para teste
const intent: PaymentIntent = { id: 'int_1', tenantId: 't1', amountCents: 5000, provider: 'abacatepay', externalId: null, status: 'pending' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const sign = (raw: string) => createHmac('sha256', ABACATEPAY_SIGNATURE_KEY).update(raw, 'utf8').digest('base64');

function webhook(payload: unknown, opts: { secret?: string | null; signature?: string; query?: boolean } = {}) {
  const raw = JSON.stringify(payload);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const secret = opts.secret === undefined ? SECRET : opts.secret;
  if (secret !== null && !opts.query) headers['X-Webhook-Secret'] = secret;
  headers['X-Webhook-Signature'] = opts.signature ?? sign(raw);
  const url = 'https://app.test/api/marketing/webhook/abacatepay' + (opts.query && secret ? `?webhookSecret=${secret}` : '');
  return new Request(url, { method: 'POST', headers, body: raw });
}

const paid = (over: Record<string, unknown> = {}) => ({
  id: 'log_1',
  event: 'transparent.completed',
  apiVersion: 2,
  devMode: true,
  data: { transparent: { id: 'pix_char_1', amount: 5000, paidAmount: null, status: 'PAID', ...over } },
});

const fetchMock = vi.fn();

beforeEach(() => {
  process.env.ABACATEPAY_API_KEY = 'abc_dev_chave_de_teste';
  process.env.ABACATEPAY_WEBHOOK_SECRET = SECRET;
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  delete process.env.ABACATEPAY_API_KEY;
  delete process.env.ABACATEPAY_WEBHOOK_SECRET;
  delete process.env.MARKETING_PAYMENT_PROVIDER;
  vi.unstubAllGlobals();
});

describe('registro do abacatepay', () => {
  it('sem envs fica invisível e o padrão continua manual, mesmo com MARKETING_PAYMENT_PROVIDER', () => {
    delete process.env.ABACATEPAY_API_KEY;
    __resetPaymentProviders();
    process.env.MARKETING_PAYMENT_PROVIDER = 'abacatepay';
    expect(defaultProviderId()).toBe('manual');
    expect(getPaymentProvider('abacatepay')).toBeNull();
  });

  it('secret curto (< 32) também desliga', () => {
    process.env.ABACATEPAY_WEBHOOK_SECRET = 'curto';
    expect(abacatePayProvider.isConfigured?.()).toBe(false);
  });

  it('com envs + MARKETING_PAYMENT_PROVIDER=abacatepay vira o padrão; sem a escolha, segue manual', () => {
    __resetPaymentProviders();
    expect(defaultProviderId()).toBe('manual');
    process.env.MARKETING_PAYMENT_PROVIDER = 'abacatepay';
    expect(defaultProviderId()).toBe('abacatepay');
    expect(getPaymentProvider()?.id).toBe('abacatepay');
  });
});

describe('createCheckout', () => {
  it('cria PIX transparente com o valor em centavos e devolve id + brCode', async () => {
    fetchMock.mockResolvedValue(
      json({
        data: { id: 'pix_char_1', amount: 5000, status: 'PENDING', devMode: true, brCode: '000201...', brCodeBase64: 'data:image/png;base64,AAA', expiresAt: '2026-11-20T13:00:00.000Z' },
        error: null,
        success: true,
      }),
    );
    const r = await abacatePayProvider.createCheckout(intent, { origin: 'https://app.test' });
    expect(r).toMatchObject({
      externalId: 'pix_char_1',
      pix: { brCode: '000201...', qrCodeImage: 'data:image/png;base64,AAA', expiresAt: '2026-11-20T13:00:00.000Z' },
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.abacatepay.com/v2/transparents/create');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer abc_dev_chave_de_teste');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ method: 'PIX', data: { amount: 5000, externalId: 'int_1', expiresIn: 3600 } });
    expect(body.data.customer).toBeUndefined();
  });

  it('erro da API vira exceção (o handler responde 502)', async () => {
    fetchMock.mockResolvedValue(json({ data: null, error: 'Invalid API key', success: false }, 401));
    await expect(abacatePayProvider.createCheckout(intent, { origin: 'https://app.test' })).rejects.toThrow(/401/);
  });

  it('valor devolvido diferente do pedido é recusado', async () => {
    fetchMock.mockResolvedValue(json({ data: { id: 'pix_char_1', amount: 1, status: 'PENDING', brCode: 'x' }, error: null }));
    await expect(abacatePayProvider.createCheckout(intent, { origin: 'https://app.test' })).rejects.toThrow(/divergente/);
  });
});

describe('createCheckout — identificação por projeto', () => {
  const ok = () =>
    fetchMock.mockResolvedValue(
      json({ data: { id: 'pix_char_9', amount: 5000, status: 'PENDING', brCode: '000201' }, error: null, success: true }),
    );
  const sentData = () => JSON.parse(fetchMock.mock.calls[0][1].body).data;

  it('sem os campos novos: comportamento de antes (externalId = id da intent, descrição padrão)', async () => {
    ok();
    await abacatePayProvider.createCheckout(intent, { origin: 'https://app.test' });
    expect(sentData()).toMatchObject({
      externalId: 'int_1',
      description: 'Saldo para divulgação de anúncios',
      metadata: { intentId: 'int_1', tenantId: 't1' },
    });
  });

  it('com externalRef/description/metadata: envia os do projeto e mantém intentId/tenantId', async () => {
    ok();
    await abacatePayProvider.createCheckout(
      {
        ...intent,
        externalRef: 'bora-impulsionamento-int_1',
        description: 'Bora Cuiabá — impulsionamento #int_1',
        metadata: { projeto: 'bora', tipo: 'impulsionamento', id: 'int_1' },
      },
      { origin: 'https://app.test' },
    );
    expect(sentData()).toMatchObject({
      externalId: 'bora-impulsionamento-int_1',
      // travessão vira hífen: a API recusa U+2014
      description: 'Bora Cuiabá - impulsionamento #int_1',
      metadata: { projeto: 'bora', tipo: 'impulsionamento', id: 'int_1', intentId: 'int_1', tenantId: 't1' },
    });
  });

  it('limpa e corta com segurança: externalId [A-Za-z0-9_-] até 64, descrição sem emoji até 140, metadata só texto', async () => {
    ok();
    await abacatePayProvider.createCheckout(
      {
        ...intent,
        externalRef: 'bora/banner #' + 'x'.repeat(100),
        description: 'Bora 🎉 ' + 'd'.repeat(300),
        metadata: { projeto: 'bora', n: 5 as unknown as string, intentId: 'forjado' },
      },
      { origin: 'https://app.test' },
    );
    const d = sentData();
    expect(d.externalId).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
    expect(d.externalId.startsWith('bora-banner-')).toBe(true);
    expect(d.description.length).toBeLessThanOrEqual(140);
    expect(d.description).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(d.metadata).toEqual({ projeto: 'bora', n: '5', intentId: 'int_1', tenantId: 't1' });
  });
});

describe('verifyWebhook', () => {
  it('pago válido (secret no header + HMAC do corpo cru) → evento paid com valor', async () => {
    expect(await abacatePayProvider.verifyWebhook(webhook(paid()))).toEqual({ externalId: 'pix_char_1', status: 'paid', amountCents: 5000 });
  });

  it('aceita o secret pelo query param webhookSecret', async () => {
    expect(await abacatePayProvider.verifyWebhook(webhook(paid(), { query: true }))).toMatchObject({ status: 'paid' });
  });

  it('usa paidAmount quando vier (valor divergente chega ao settle, que recusa)', async () => {
    expect(await abacatePayProvider.verifyWebhook(webhook(paid({ paidAmount: 4999 })))).toMatchObject({ amountCents: 4999 });
  });

  it('secret errado ou ausente → null', async () => {
    expect(await abacatePayProvider.verifyWebhook(webhook(paid(), { secret: 'x'.repeat(40) }))).toBeNull();
    expect(await abacatePayProvider.verifyWebhook(webhook(paid(), { secret: null }))).toBeNull();
  });

  it('assinatura inválida (ou corpo adulterado) → null', async () => {
    expect(await abacatePayProvider.verifyWebhook(webhook(paid(), { signature: sign('{"outro":1}') }))).toBeNull();
    expect(await abacatePayProvider.verifyWebhook(webhook(paid(), { signature: '' }))).toBeNull();
  });

  it('eventos irrelevantes → null (estorno, checkout hospedado, status não pago)', async () => {
    expect(await abacatePayProvider.verifyWebhook(webhook({ ...paid(), event: 'transparent.refunded' }))).toBeNull();
    expect(await abacatePayProvider.verifyWebhook(webhook({ ...paid(), event: 'checkout.completed' }))).toBeNull();
    expect(await abacatePayProvider.verifyWebhook(webhook(paid({ status: 'UNDER_DISPUTE' })))).toBeNull();
  });

  it('evento do Modo Teste com chave de produção → null', async () => {
    process.env.ABACATEPAY_API_KEY = 'abc_prod_chave_ficticia';
    expect(await abacatePayProvider.verifyWebhook(webhook(paid()))).toBeNull();
    expect(await abacatePayProvider.verifyWebhook(webhook({ ...paid(), devMode: false }))).toMatchObject({ status: 'paid' });
  });
});

describe('valor divergente no fluxo completo', () => {
  it('webhook com valor diferente da intent não credita (settle → amount_mismatch)', async () => {
    const { settlePayment } = await import('./settle');
    const event = await abacatePayProvider.verifyWebhook(webhook(paid({ amount: 100 })));
    const table = vi.fn(async (path: string) =>
      path.startsWith('/payment_intents?provider')
        ? json([{ id: 'int_1', tenant_id: 't1', amount_cents: 5000, provider: 'abacatepay', external_id: 'pix_char_1', status: 'pending' }])
        : json({}),
    );
    const r = await settlePayment({ table, rpc: vi.fn() } as unknown as ServiceDb, 'abacatepay', event!);
    expect(r).toEqual({ ok: false, reason: 'amount_mismatch' });
    expect(table.mock.calls.some(([p]) => p === '/wallet_ledger')).toBe(false);
  });
});

describe('checkStatus / reconcilePending', () => {
  it('EXPIRED fecha a intent pendente sem crédito; manual é ignorado', async () => {
    process.env.POSTGREST_SERVICE_TOKEN = 'tok';
    __resetPaymentProviders();
    fetchMock.mockResolvedValue(json({ data: { id: 'pix_char_1', status: 'EXPIRED', expiresAt: 'x' }, error: null }));
    const table = vi.fn(async (path: string) =>
      path.startsWith('/payment_intents?provider')
        ? json([{ id: 'int_1', tenant_id: 't1', amount_cents: 5000, provider: 'abacatepay', external_id: 'pix_char_1', status: 'pending' }])
        : json({}),
    );
    const db = { table, rpc: vi.fn() } as unknown as ServiceDb;
    const n = await reconcilePending(
      [
        { id: 'int_1', provider: 'abacatepay', external_id: 'pix_char_1' },
        { id: 'int_2', provider: 'manual', external_id: null },
      ],
      db,
    );
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.abacatepay.com/v2/transparents/check?id=pix_char_1');
    expect(n).toBe(1);
    expect(table.mock.calls.some(([p, init]) => p === '/payment_intents?id=eq.int_1' && String((init as RequestInit)?.body).includes('expired'))).toBe(true);
    expect(table.mock.calls.some(([p]) => p === '/wallet_ledger')).toBe(false);
    delete process.env.POSTGREST_SERVICE_TOKEN;
  });

  it('PENDING não muda nada', async () => {
    fetchMock.mockResolvedValue(json({ data: { id: 'pix_char_1', status: 'PENDING' }, error: null }));
    expect(await abacatePayProvider.checkStatus!('pix_char_1')).toBeNull();
  });
});
