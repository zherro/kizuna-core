import type { PaymentProvider, WebhookEvent } from './types';

/**
 * Provedor `dev` — SÓ para desenvolvimento local, para testar a compra ponta a ponta sem chave de
 * provedor real. Nunca fica ativo com NODE_ENV=production. Liga com:
 *   MARKETING_DEV_PAYMENTS=1  e  MARKETING_PAYMENT_PROVIDER=dev
 * O "PIX" é falso; a consulta de status (poll da tela) dá o pagamento como confirmado depois de
 * MARKETING_DEV_PAY_AFTER_SECONDS (padrão 10 s), passando pelo mesmo `settlePayment` do webhook.
 */
const devEnabled = () => process.env.NODE_ENV !== 'production' && process.env.MARKETING_DEV_PAYMENTS === '1';

const delayMs = () => {
  const n = Number(process.env.MARKETING_DEV_PAY_AFTER_SECONDS);
  return (Number.isFinite(n) && n >= 0 ? n : 10) * 1000;
};

export const devPaymentProvider: PaymentProvider = {
  id: 'dev',
  isConfigured: devEnabled,
  async createCheckout(intent) {
    if (!devEnabled()) throw new Error('provedor dev desligado');
    return {
      externalId: `dev_${intent.id}_${Date.now()}`,
      pix: { brCode: `DEV-PIX-${intent.id}-NAO-PAGAVEL`, expiresAt: new Date(Date.now() + 3600_000).toISOString() },
      instructions: `Ambiente de desenvolvimento: o pagamento é simulado e confirma sozinho em ${Math.round(delayMs() / 1000)} s.`,
    };
  },
  async verifyWebhook() {
    return null;
  },
  async checkStatus(externalId: string): Promise<WebhookEvent | null> {
    if (!devEnabled()) return null;
    const ts = Number(externalId.split('_').pop());
    if (!Number.isFinite(ts)) return null;
    return Date.now() - ts >= delayMs() ? { externalId, status: 'paid' } : null;
  },
};
