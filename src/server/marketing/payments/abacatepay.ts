import { createHmac, timingSafeEqual } from 'node:crypto';
import type { CheckoutResult, PaymentIntent, PaymentProvider, WebhookEvent } from './types';

/**
 * Provedor AbacatePay (API v2) — PIX pelo checkout transparente.
 *
 * Por que o transparente e não o checkout hospedado (`/checkouts/create`): o hospedado só aceita
 * `items` de produtos já cadastrados no painel (preço fixo), e a recarga de saldo tem valor livre.
 * O transparente recebe `amount` em centavos e devolve o QR Code (`brCode` + imagem base64), que a
 * carteira mostra na própria página.
 *
 * Docs (conferidas em 2026-11):
 * - Criar PIX:   https://docs.abacatepay.com/pages/transparents/create
 * - Checar PIX:  https://docs.abacatepay.com/pages/transparents/check
 * - Webhooks:    https://docs.abacatepay.com/pages/notificacoes/webhooks
 * - Segurança:   https://docs.abacatepay.com/pages/notificacoes/seguranca
 * - Eventos:     https://docs.abacatepay.com/pages/webhooks/events/transparent
 * - Modo Teste:  https://docs.abacatepay.com/pages/comecar/modo-teste
 *
 * Só fica ativo com `ABACATEPAY_API_KEY` + `ABACATEPAY_WEBHOOK_SECRET` (e
 * `MARKETING_PAYMENT_PROVIDER=abacatepay` para virar o padrão). Sem isso, nada muda.
 */

export const ABACATEPAY_API_BASE = 'https://api.abacatepay.com/v2';

/**
 * Chave da AbacatePay usada no HMAC-SHA256 do header `X-Webhook-Signature`. É PÚBLICA e igual para
 * todas as contas (publicada nos exemplos da página de segurança) — não é segredo nem a chave `pk_`.
 * Ela só prova a integridade do corpo; quem prova a ORIGEM é o secret do webhook.
 */
export const ABACATEPAY_SIGNATURE_KEY =
  't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9';

const DEFAULT_EXPIRES_IN = 3600; // 1 h; a doc aceita >= 300 s (padrão deles: 24 h)
const MIN_SECRET_LENGTH = 32; // o painel exige secret de 32+ caracteres

type Config = { apiKey: string; webhookSecret: string; expiresIn: number; signatureKey: string };

function readConfig(): Config | null {
  const apiKey = process.env.ABACATEPAY_API_KEY?.trim();
  const webhookSecret = process.env.ABACATEPAY_WEBHOOK_SECRET?.trim();
  if (!apiKey || !webhookSecret || webhookSecret.length < MIN_SECRET_LENGTH) return null;
  const raw = Number(process.env.ABACATEPAY_PIX_EXPIRES_IN);
  const expiresIn = Number.isInteger(raw) && raw >= 300 ? raw : DEFAULT_EXPIRES_IN;
  const signatureKey = process.env.ABACATEPAY_SIGNATURE_KEY?.trim() || ABACATEPAY_SIGNATURE_KEY;
  return { apiKey, webhookSecret, expiresIn, signatureKey };
}

function requireConfig(): Config {
  const cfg = readConfig();
  if (!cfg) throw new Error('AbacatePay não configurado (ABACATEPAY_API_KEY / ABACATEPAY_WEBHOOK_SECRET).');
  return cfg;
}

/** Comparação em tempo constante (o tamanho diferente sai cedo, como no exemplo oficial). */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

type ApiEnvelope<T> = { data?: T | null; error?: string | null; success?: boolean };

async function api<T>(cfg: Config, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(ABACATEPAY_API_BASE + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
    cache: 'no-store',
  });
  const body = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!res.ok || !body || body.error || !body.data) {
    throw new Error(`AbacatePay ${path}: ${res.status} ${body?.error ?? 'resposta inválida'}`);
  }
  return body.data;
}

type PixCharge = {
  id: string;
  amount: number;
  status: string;
  brCode?: string;
  brCodeBase64?: string;
  expiresAt?: string;
  devMode?: boolean;
};

/** Status do PIX na AbacatePay → status da intent (o resto fica pendente/irrelevante). */
function mapStatus(status: string | undefined): WebhookEvent['status'] | null {
  switch (status) {
    case 'PAID':
      return 'paid';
    case 'EXPIRED':
      return 'expired';
    case 'CANCELLED':
    case 'FAILED':
      return 'failed';
    default:
      return null;
  }
}

const isProdKey = (cfg: Config) => cfg.apiKey.startsWith('abc_prod_');

export const abacatePayProvider: PaymentProvider = {
  id: 'abacatepay',

  isConfigured: () => readConfig() !== null,

  async createCheckout(intent: PaymentIntent): Promise<CheckoutResult> {
    const cfg = requireConfig();
    // Cliente é opcional no PIX transparente; se mandado, a doc exige nome+CPF+e-mail+celular.
    // Não mandamos: o perfil não garante CPF/telefone e não inventamos dados.
    const charge = await api<PixCharge>(cfg, '/transparents/create', {
      method: 'POST',
      body: JSON.stringify({
        method: 'PIX',
        data: {
          amount: intent.amountCents,
          description: 'Saldo para divulgacao de anuncios',
          expiresIn: cfg.expiresIn,
          externalId: intent.id, // idempotência do lado deles
          metadata: { intentId: intent.id, tenantId: intent.tenantId },
        },
      }),
    });
    if (!charge.id || !charge.brCode) throw new Error('AbacatePay: resposta sem id/brCode');
    if (charge.amount !== intent.amountCents) throw new Error('AbacatePay: valor da cobrança divergente');
    return {
      externalId: charge.id,
      pix: {
        brCode: charge.brCode,
        qrCodeImage: charge.brCodeBase64?.startsWith('data:image/') ? charge.brCodeBase64 : undefined,
        expiresAt: charge.expiresAt,
      },
      instructions:
        'Pague o PIX pelo QR Code ou pelo código copia e cola. O saldo entra assim que o pagamento for confirmado.',
    };
  },

  async verifyWebhook(request: Request): Promise<WebhookEvent | null> {
    const cfg = readConfig();
    if (!cfg) return null;
    const raw = await request.text();

    // 1) Origem: o secret vem no header X-Webhook-Secret e no query param webhookSecret.
    const received =
      request.headers.get('x-webhook-secret') ?? new URL(request.url).searchParams.get('webhookSecret') ?? '';
    if (!safeEqual(received, cfg.webhookSecret)) return null;

    // 2) Integridade: HMAC-SHA256 (base64) do corpo CRU com a chave pública da AbacatePay.
    const signature = request.headers.get('x-webhook-signature') ?? '';
    const expected = createHmac('sha256', cfg.signatureKey).update(raw, 'utf8').digest('base64');
    if (!safeEqual(expected, signature)) return null;

    let payload: {
      event?: string;
      devMode?: boolean;
      data?: { transparent?: { id?: string; amount?: number; paidAmount?: number | null; status?: string } };
    };
    try {
      payload = JSON.parse(raw);
    } catch {
      return null;
    }
    // Evento do Modo Teste não pode liquidar nada numa chave de produção.
    if (isProdKey(cfg) && payload.devMode === true) return null;

    // Só o pagamento do PIX transparente interessa. Estorno/disputa (transparent.refunded,
    // .disputed, .lost) NÃO debitam o saldo aqui — ficam para o admin (ver relatório/README).
    // Não há evento de expiração: isso vem de `checkStatus`.
    if (payload.event !== 'transparent.completed') return null;
    const t = payload.data?.transparent;
    if (!t?.id || t.status !== 'PAID') return null;
    const amount = typeof t.paidAmount === 'number' ? t.paidAmount : t.amount;
    if (typeof amount !== 'number' || !Number.isInteger(amount)) return null;
    return { externalId: t.id, status: 'paid', amountCents: amount };
  },

  /** Consulta o status (GET /transparents/check) — cobre a expiração, que não tem webhook. */
  async checkStatus(externalId: string): Promise<WebhookEvent | null> {
    const cfg = requireConfig();
    const data = await api<{ id: string; status: string }>(
      cfg,
      `/transparents/check?id=${encodeURIComponent(externalId)}`,
    );
    const status = mapStatus(data.status);
    // Sem valor na resposta: o settle credita o valor da própria intent (a cobrança foi criada com ele).
    return status ? { externalId, status } : null;
  },
};
