import type { ServiceDb } from '../../service-db';
import { fulfillPurpose, parsePurpose } from './purpose';
import type { PaymentIntent, WebhookEvent } from './types';

export type SettleResult =
  | { ok: true; credited: boolean }
  | { ok: false; reason: 'not_found' | 'amount_mismatch' | 'error' };

type IntentRow = {
  id: string;
  tenant_id: string;
  amount_cents: number | string;
  provider: string;
  external_id: string | null;
  status: PaymentIntent['status'];
  created_by?: string;
  purpose?: unknown;
  fulfilled_ref?: string | null;
  fulfill_error?: string | null;
};

const INTENT_BASE_SELECT = 'id,tenant_id,amount_cents,provider,external_id,status';
export const INTENT_SETTLE_SELECT = `${INTENT_BASE_SELECT},created_by,purpose,fulfilled_ref,fulfill_error`;

/**
 * Liquida um pagamento confirmado pelo provedor. Roda como `service_role` e é IDEMPOTENTE:
 * webhook reentregue não credita duas vezes — o índice único `wallet_ledger_payment_once`
 * (kind=credit_payment, ref_id = intent) recusa a segunda inserção (409) e só então marcamos pago.
 * Ordem: lança o crédito primeiro, depois marca `paid`; se cair no meio, o próximo webhook conclui.
 */
export async function settlePayment(
  db: ServiceDb,
  provider: string,
  event: WebhookEvent,
): Promise<SettleResult> {
  const lookup = (select: string) =>
    db.table(
      `/payment_intents?provider=eq.${encodeURIComponent(provider)}&external_id=eq.${encodeURIComponent(event.externalId)}` +
        `&select=${select}&limit=1`,
    );
  let found = await lookup(INTENT_SETTLE_SELECT);
  // Banco sem a 0002 (colunas de compra direta): segue como recarga simples.
  if (found.status === 400) found = await lookup(INTENT_BASE_SELECT);
  if (!found.ok) return { ok: false, reason: 'error' };
  const [row] = (await found.json()) as IntentRow[];
  if (!row) return { ok: false, reason: 'not_found' };

  const setStatus = async (status: PaymentIntent['status']) =>
    db.table(`/payment_intents?id=eq.${row.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
    });

  if (event.status !== 'paid') {
    if (row.status === 'pending') await setStatus(event.status);
    return { ok: true, credited: false };
  }

  const amount = Number(row.amount_cents);
  if (event.amountCents !== undefined && event.amountCents !== amount) {
    return { ok: false, reason: 'amount_mismatch' };
  }

  const credit = await db.table('/wallet_ledger', {
    method: 'POST',
    body: JSON.stringify({
      tenant_id: row.tenant_id,
      kind: 'credit_payment',
      amount_cents: amount,
      ref_id: row.id,
      note: `Pagamento ${provider}`,
      created_by: null,
    }),
  });
  // 409 = já creditado (índice único). Qualquer outro erro: o provedor tenta de novo.
  if (!credit.ok && credit.status !== 409) return { ok: false, reason: 'error' };

  // Compra direta (0002): com o crédito lançado, cria o boost/campanha. Falha permanente (anúncio
  // despublicado, espaço fechado…) NÃO perde o dinheiro: o valor fica no saldo e o motivo vai para
  // `fulfill_error`. Falha transitória: devolve erro e o provedor reentrega (tudo idempotente).
  const patch: Record<string, unknown> = {};
  const purpose = row.purpose ? parsePurpose(row.purpose) : null;
  if (row.purpose && !row.fulfilled_ref && !row.fulfill_error) {
    if (!purpose || !row.created_by) {
      patch.fulfill_error = 'Pedido inválido: o valor ficou no saldo.';
    } else {
      const done = await fulfillPurpose(db, { id: row.id, tenantId: row.tenant_id, createdBy: row.created_by }, purpose);
      if (done.ok) patch.fulfilled_ref = done.ref;
      else if (done.transient) return { ok: false, reason: 'error' };
      else patch.fulfill_error = `${done.reason} O valor ficou no saldo.`.slice(0, 300);
    }
  }

  if (row.status !== 'paid' || Object.keys(patch).length > 0) {
    const patched = await db.table(`/payment_intents?id=eq.${row.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...patch, status: 'paid', updated_at: new Date().toISOString() }),
    });
    if (!patched.ok) return { ok: false, reason: 'error' };
  }
  return { ok: true, credited: credit.ok };
}
