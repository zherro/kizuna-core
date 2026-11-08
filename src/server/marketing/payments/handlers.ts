import { NextResponse } from 'next/server';
import { getAuthHeaderFromCookies, getSession } from '../../auth';
import { pgrstTable } from '../../postrest/conn';
import { hasServiceAccess, serviceDb, type ServiceDb } from '../../service-db';
import { defaultProviderId, getPaymentProvider } from './registry';
import { settlePayment } from './settle';
import type { PaymentIntent } from './types';

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

export function createCheckoutHandler() {
  return async function POST(request: Request) {
    const session = await getSession();
    if (!session || session.role !== 'auth_user') {
      return NextResponse.json({ message: 'Faça login para adicionar saldo.' }, { status: 401 });
    }
    const auth = await getAuthHeaderFromCookies();
    if (!auth) return NextResponse.json({ message: 'Sessão expirada.' }, { status: 401 });

    const amountCents = parseTopupAmount(await request.json().catch(() => null));
    if (amountCents === null) {
      return NextResponse.json(
        { message: 'Informe um valor entre R$ 10,00 e R$ 100.000,00.' },
        { status: 400 },
      );
    }

    const provider = getPaymentProvider(defaultProviderId());
    if (!provider) return NextResponse.json({ message: 'Pagamento indisponível.' }, { status: 503 });

    // Freio simples contra pedidos em massa: poucos pendentes por vez.
    const pending = await pgrstTable(
      '/payment_intents?status=eq.pending&select=id&limit=' + (MAX_PENDING + 1),
      { method: 'GET', headers: PUBLIC_PROFILE },
      { auth },
    );
    if (pending.ok && ((await pending.json()) as unknown[]).length >= MAX_PENDING) {
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
        body: JSON.stringify({ amount_cents: amountCents, provider: provider.id }),
      },
      { auth },
    );
    if (!created.ok) {
      return NextResponse.json({ message: 'Não foi possível registrar o pedido.' }, { status: created.status });
    }
    const [row] = (await created.json()) as IntentRow[];
    const intent = toIntent(row);

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
      { intentId: intent.id, status: intent.status, url: checkout.url, instructions: checkout.instructions },
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
