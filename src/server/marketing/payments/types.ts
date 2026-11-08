/**
 * Portal de pagamento do marketing — agnóstico de provedor (o provedor real ainda não foi
 * escolhido). Um provedor só sabe duas coisas: abrir um checkout e interpretar o webhook dele.
 * Quem credita o saldo é `settlePayment` (service_role), nunca o provedor nem o navegador.
 */
export type PaymentIntent = {
  id: string;
  tenantId: string;
  amountCents: number;
  provider: string;
  externalId: string | null;
  status: 'pending' | 'paid' | 'failed' | 'expired';
};

export type CheckoutResult = {
  /** Identificador do pagamento no provedor (guardado em `payment_intents.external_id`). */
  externalId?: string;
  /** Página de pagamento do provedor: o navegador é redirecionado para ela. */
  url?: string;
  /** Sem URL (ex.: provedor manual): texto para o usuário seguir (PIX/transferência etc.). */
  instructions?: string;
};

export type WebhookEvent = {
  /** Mesmo `external_id` devolvido no checkout. */
  externalId: string;
  status: 'paid' | 'failed' | 'expired';
  /** Valor confirmado pelo provedor; se vier, precisa bater com o da intent. */
  amountCents?: number;
};

export interface PaymentProvider {
  readonly id: string;
  createCheckout(intent: PaymentIntent, ctx: { origin: string }): Promise<CheckoutResult>;
  /**
   * Valida a ASSINATURA do webhook e devolve o evento; `null` se for inválido/irrelevante.
   * Lê o corpo cru (`await request.text()`) — a assinatura é sobre os bytes originais.
   */
  verifyWebhook(request: Request): Promise<WebhookEvent | null>;
}
