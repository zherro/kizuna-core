import type { ServiceDb } from '../../service-db';
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
};

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
  const found = await db.table(
    `/payment_intents?provider=eq.${encodeURIComponent(provider)}&external_id=eq.${encodeURIComponent(event.externalId)}` +
      `&select=id,tenant_id,amount_cents,provider,external_id,status&limit=1`,
  );
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

  if (row.status !== 'paid') {
    const patched = await setStatus('paid');
    if (!patched.ok) return { ok: false, reason: 'error' };
  }
  return { ok: true, credited: credit.ok };
}
