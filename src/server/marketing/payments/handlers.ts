import { NextResponse } from 'next/server';
import { getAuthHeaderFromCookies, getSession } from '../../auth';
import { pgrstTable } from '../../postrest/conn';
import { hasServiceAccess, serviceDb, type ServiceDb } from '../../service-db';
import { defaultProviderId, getPaymentProvider } from './registry';
import { parsePurpose, planPurpose, type Purpose } from './purpose';
import { settlePayment } from './settle';
import type { PaymentIntent } from './types';
import { projectChargeFields } from './reference';
import { projectChargeReference } from './reference-config';

export const MIN_TOPUP_CENTS = 1_000;
export const MAX_TOPUP_CENTS = 100_000_00;
const MAX_PENDING = 5;

type IntentRow = {
  id: string;
  tenant_id: string;
  amount_cents: number | string;
  provider: string;
  external_id: string | null;
  status: PaymentIntent['status'];
};

const toIntent = (r: IntentRow): PaymentIntent => ({
  id: r.id,
  tenantId: r.tenant_id,
  amountCents: Number(r.amount_cents),
  provider: r.provider,
  externalId: r.external_id,
  status: r.status,
});

export function parseTopupAmount(body: unknown): number | null {
  const raw = (body as { amountCents?: unknown } | null)?.amountCents;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isInteger(n) || n < MIN_TOPUP_CENTS || n > MAX_TOPUP_CENTS) return null;
  return n;
}

/**
 * POST /api/marketing/checkout  { amountCents }
 * Cria a intenção `pending` COM O JWT DO USUÁRIO (a RLS impõe tenant e status) e pede o checkout ao
 * provedor. Não credita nada: só o webhook (service_role) ou o admin lançam saldo.
 */
// O PostgREST resolve o schema padrão pela 1ª entrada de PGRST_DB_SCHEMAS (em alguns ambientes é `auth`).
const PUBLIC_PROFILE = { 'Accept-Profile': 'public', 'Content-Profile': 'public' };

/** Provedores que confirmam sozinhos (webhook/consulta). O `manual` depende do admin: sem compra direta. */
export function supportsDirectPurchase(providerId: string): boolean {
  return providerId !== 'manual';
}

/** GET /api/marketing/checkout — o que a tela pode oferecer (sem segredo nenhum). */
export function createCheckoutInfoHandler() {
  return async function GET() {
    const provider = getPaymentProvider(defaultProviderId());
    const id = provider?.id ?? 'manual';
    return NextResponse.json(
      { provider: id, directPurchase: supportsDirectPurchase(id) && hasServiceAccess() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  };
}

type PendingRow = { id: string; provider?: string; external_id?: string | null };

/**
 * Pergunta ao provedor (com a chave do servidor) o status das intents pendentes que têm id externo
 * e liquida pelo mesmo `settlePayment` do webhook (idempotente). Devolve quantas saíram de
 * `pending`. Provedor sem `checkStatus` (o `manual`) não faz nada — comportamento de sempre.
 */
export async function reconcilePending(rows: PendingRow[], db: ServiceDb = serviceDb): Promise<number> {
  let resolved = 0;
  for (const row of rows) {
    if (!row.external_id || !row.provider) continue;
    const provider = getPaymentProvider(row.provider);
    if (!provider?.checkStatus || provider.id !== row.provider || !hasServiceAccess()) continue;
    try {
      const event = await provider.checkStatus(row.external_id);
      if (!event) continue;
      const r = await settlePayment(db, provider.id, event);
      if (r.ok) resolved++;
    } catch {
      // provedor fora do ar: segue com o próximo; o webhook ou a próxima tentativa resolve
    }
  }
  return resolved;
}

export function createCheckoutHandler() {
  return async function POST(request: Request) {
    const session = await getSession();
    if (!session || session.role !== 'auth_user') {
      return NextResponse.json({ message: 'Faça login para adicionar saldo.' }, { status: 401 });
    }
    const auth = await getAuthHeaderFromCookies();
    if (!auth) return NextResponse.json({ message: 'Sessão expirada.' }, { status: 401 });

    const body = (await request.json().catch(() => null)) as { purpose?: unknown } | null;
    const provider = getPaymentProvider(defaultProviderId());
    if (!provider) return NextResponse.json({ message: 'Pagamento indisponível.' }, { status: 503 });

    // Compra direta (impulsionar / banner): o valor sai do propósito, conferido no servidor.
    let purpose: Purpose | null = null;
    let amountCents: number | null;
    if (body?.purpose !== undefined) {
      if (!supportsDirectPurchase(provider.id) || !hasServiceAccess()) {
        return NextResponse.json({ message: 'Pagamento direto indisponível. Adicione saldo na carteira.' }, { status: 400 });
      }
      purpose = parsePurpose(body.purpose);
      if (!purpose) return NextResponse.json({ message: 'Pedido inválido.' }, { status: 400 });
      const plan = await planPurpose(serviceDb, { tenantId: session.tenant_id, userId: session.user_id }, purpose);
      if (!plan.ok) return NextResponse.json({ message: plan.reason }, { status: plan.transient ? 502 : 400 });
      amountCents = plan.costCents;
      if (amountCents < MIN_TOPUP_CENTS || amountCents > MAX_TOPUP_CENTS) {
        return NextResponse.json(
          { message: 'O pagamento direto vai de R$ 10,00 a R$ 100.000,00. Aumente a diária ou os dias.' },
          { status: 400 },
        );
      }
    } else {
      amountCents = parseTopupAmount(body);
    }
    if (amountCents === null) {
      return NextResponse.json(
        { message: 'Informe um valor entre R$ 10,00 e R$ 100.000,00.' },
        { status: 400 },
      );
    }

    // Freio simples contra pedidos em massa: poucos pendentes por vez.
    const pending = await pgrstTable(
      '/payment_intents?status=eq.pending&select=id,provider,external_id&limit=' + (MAX_PENDING + 1),
      { method: 'GET', headers: PUBLIC_PROFILE },
      { auth },
    );
    const pendingRows = pending.ok ? ((await pending.json()) as PendingRow[]) : [];
    // Provedores que consultam status (ex.: PIX que expira sem webhook) liberam os pendentes vencidos.
    const resolved = await reconcilePending(pendingRows);
    if (pending.ok && pendingRows.length - resolved >= MAX_PENDING) {
      return NextResponse.json(
        { message: 'Você já tem pedidos de saldo em aberto. Conclua ou aguarde a confirmação.' },
        { status: 429 },
      );
    }

    const created = await pgrstTable(
      '/payment_intents?select=id,tenant_id,amount_cents,provider,external_id,status',
      {
        method: 'POST',
        headers: { ...PUBLIC_PROFILE, Prefer: 'return=representation' },
        body: JSON.stringify({ amount_cents: amountCents, provider: provider.id, ...(purpose ? { purpose } : {}) }),
      },
      { auth },
    );
    if (!created.ok) {
      return NextResponse.json({ message: 'Não foi possível registrar o pedido.' }, { status: created.status });
    }
    const [row] = (await created.json()) as IntentRow[];
    // Referência/descrição com o nome do projeto (conciliação de contas compartilhadas); sem
    // `marketing.payments.referencePrefix` no config, sai como sempre.
    const base = toIntent(row);
    const intent = { ...base, ...projectChargeFields(base.id, purpose, projectChargeReference) };

    let checkout;
    try {
      checkout = await provider.createCheckout(intent, { origin: new URL(request.url).origin });
    } catch {
      return NextResponse.json({ message: 'O provedor de pagamento não respondeu.' }, { status: 502 });
    }

    // Guarda o id do provedor (só o servidor escreve external_id). Sem service_role, o webhook não
    // teria como casar — então avisa em vez de seguir.
    if (checkout.externalId) {
      if (!hasServiceAccess()) {
        return NextResponse.json({ message: 'Pagamento indisponível.' }, { status: 503 });
      }
      const patched = await serviceDb.table(`/payment_intents?id=eq.${intent.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ external_id: checkout.externalId }),
      });
      if (!patched.ok) return NextResponse.json({ message: 'Falha ao registrar o pagamento.' }, { status: 502 });
    }

    return NextResponse.json(
      {
        intentId: intent.id,
        status: intent.status,
        url: checkout.url,
        instructions: checkout.instructions,
        pix: checkout.pix,
        amountCents: intent.amountCents,
      },
      { status: 201 },
    );
  };
}

/**
 * POST /api/marketing/webhook/<provedor> — o provedor avisa que pagou. Autenticidade = assinatura,
 * verificada pelo provedor sobre o corpo cru. Resposta 200 só se liquidou (ou já estava liquidado);
 * 5xx faz o provedor reentregar.
 */
export function createPaymentWebhookHandler(db: ServiceDb = serviceDb) {
  return async function POST(request: Request, ctx: { params: Promise<{ provider: string }> }) {
    const { provider: providerId } = await ctx.params;
    const provider = getPaymentProvider(providerId);
    if (!provider || provider.id !== providerId) return NextResponse.json({ ok: false }, { status: 404 });

    const event = await provider.verifyWebhook(request).catch(() => null);
    if (!event) return NextResponse.json({ ok: false }, { status: 400 });

    if (!hasServiceAccess()) return NextResponse.json({ ok: false }, { status: 503 });
    const result = await settlePayment(db, provider.id, event).catch(() => ({ ok: false as const, reason: 'error' as const }));
    if (result.ok) return NextResponse.json({ ok: true });
    if (result.reason === 'not_found' || result.reason === 'amount_mismatch') {
      return NextResponse.json({ ok: false, reason: result.reason }, { status: 422 });
    }
    return NextResponse.json({ ok: false }, { status: 500 });
  };
}

type StatusRow = {
  id: string;
  status: PaymentIntent['status'];
  provider: string;
  external_id: string | null;
  purpose?: { kind?: string; creativeId?: string } | null;
  fulfilled_ref?: string | null;
  fulfill_error?: string | null;
};

export type PurchaseOutcome =
  | 'waiting'
  | 'closed'
  | 'credited'
  | 'boost_active'
  | 'campaign_review'
  | 'campaign_approved'
  | 'campaign_rejected'
  | 'kept_in_balance';

export type PurchaseStatus = { status: PaymentIntent['status']; outcome: PurchaseOutcome; message?: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/marketing/checkout/status?id=<intent>[&check=1] — a tela acompanha o pagamento sem
 * recarregar. Lê a intent COM O JWT DO USUÁRIO (RLS: só a própria). Com `check=1` e ainda pendente,
 * pergunta ao provedor (`checkStatus`) e liquida pelo mesmo `settlePayment` — cobre webhook atrasado.
 */
export function createCheckoutStatusHandler() {
  return async function GET(request: Request) {
    const session = await getSession();
    const auth = session?.role === 'auth_user' ? await getAuthHeaderFromCookies() : null;
    if (!session || !auth) return NextResponse.json({ message: 'Faça login.' }, { status: 401 });
    const url = new URL(request.url);
    const id = url.searchParams.get('id') ?? '';
    if (!UUID_RE.test(id)) return NextResponse.json({ message: 'Pedido inválido.' }, { status: 400 });

    const read = async (): Promise<StatusRow | null> => {
      const res = await pgrstTable(
        `/payment_intents?id=eq.${id}&select=id,status,provider,external_id,purpose,fulfilled_ref,fulfill_error&limit=1`,
        { method: 'GET', headers: PUBLIC_PROFILE },
        { auth },
      );
      if (!res.ok) return null;
      return ((await res.json()) as StatusRow[])[0] ?? null;
    };
    let row = await read();
    if (!row) return NextResponse.json({ message: 'Pedido não encontrado.' }, { status: 404 });
    if (row.status === 'pending' && url.searchParams.get('check') === '1') {
      if ((await reconcilePending([row])) > 0) row = (await read()) ?? row;
    }

    const reply = (s: PurchaseStatus) => NextResponse.json(s, { headers: { 'Cache-Control': 'no-store' } });
    if (row.status !== 'paid') return reply({ status: row.status, outcome: row.status === 'pending' ? 'waiting' : 'closed' });
    if (!row.purpose) return reply({ status: 'paid', outcome: 'credited' });
    if (row.fulfill_error) return reply({ status: 'paid', outcome: 'kept_in_balance', message: row.fulfill_error });
    if (!row.fulfilled_ref) return reply({ status: 'paid', outcome: 'waiting' });
    if (row.purpose.kind === 'boost') return reply({ status: 'paid', outcome: 'boost_active' });

    // Banner: situação da revisão pela view do próprio anunciante.
    let outcome: PurchaseOutcome = 'campaign_review';
    const creativeId = row.purpose.creativeId;
    if (creativeId && UUID_RE.test(creativeId)) {
      const rv = await pgrstTable(
        `/vw_my_ad_creatives?id=eq.${creativeId}&select=review_status&limit=1`,
        { method: 'GET', headers: PUBLIC_PROFILE },
        { auth },
      );
      const st = rv.ok ? ((await rv.json()) as Array<{ review_status: string }>)[0]?.review_status : undefined;
      if (st === 'approved') outcome = 'campaign_approved';
      else if (st === 'rejected') outcome = 'campaign_rejected';
    }
    return reply({ status: 'paid', outcome });
  };
}
