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

// Limites conservadores: a doc da v2 não documenta o tamanho de externalId/metadata e diverge sobre
// a descrição (140 na página de PIX × 500 na especificação); emoji é recusado.
const MAX_EXTERNAL_ID = 64;
const MAX_DESCRIPTION = 140;
const MAX_META_KEYS = 20;
const MAX_META_VALUE = 120;
const DEFAULT_DESCRIPTION = 'Saldo para divulgação de anúncios';

/** `externalRef` do projeto (só [A-Za-z0-9_-], até 64) ou, sem ele, o id da intent. */
function chargeExternalId(intent: PaymentIntent): string {
  const ref = (intent.externalRef ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, MAX_EXTERNAL_ID);
  return ref || intent.id;
}

/**
 * Descrição do projeto aceitável pela API (sandbox de 20/11: "Disallowed character in description:
 * '—' (U+2014)"; acentos e '#' passam): sem emoji/controle, pontuação tipográfica em ASCII,
 * cortada em 140; vazia → a padrão.
 */
function chargeDescription(description: string | undefined): string {
  const clean = (description ?? '')
    .replace(/[‒-―−]/g, '-')
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/…/g, '...')
    .replace(/[\p{Extended_Pictographic}\p{Cc}️‍]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return DEFAULT_DESCRIPTION;
  return clean.length > MAX_DESCRIPTION ? clean.slice(0, MAX_DESCRIPTION - 3).trimEnd() + '...' : clean;
}

/** Metadata plano e só texto; `intentId`/`tenantId` sempre do sistema (não dá para forjar). */
function chargeMetadata(intent: PaymentIntent): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(intent.metadata ?? {}).slice(0, MAX_META_KEYS)) {
    if (v === null || v === undefined || typeof v === 'object') continue;
    out[k] = String(v).slice(0, MAX_META_VALUE);
  }
  out.intentId = intent.id;
  out.tenantId = intent.tenantId;
  return out;
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
          description: chargeDescription(intent.description),
          expiresIn: cfg.expiresIn,
          // Idempotência do lado deles: cobrança PIX pendente com o mesmo externalId é devolvida.
          externalId: chargeExternalId(intent),
          metadata: chargeMetadata(intent),
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
