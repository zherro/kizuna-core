import type { PaymentProvider } from './types';

const providers = new Map<string, PaymentProvider>();

/**
 * Provedor `manual`: não cobra nada sozinho. Mostra a instrução configurada (PIX, transferência…)
 * e o admin credita o saldo na gestão de usuários depois de conferir. É o padrão até existir um
 * provedor real — que se registra com `registerPaymentProvider` e vira padrão por
 * `MARKETING_PAYMENT_PROVIDER`.
 */
export const manualProvider: PaymentProvider = {
  id: 'manual',
  async createCheckout() {
    return {
      instructions:
        process.env.MARKETING_MANUAL_INSTRUCTIONS?.trim() ||
        'Pedido registrado. Entre em contato com a equipe para concluir o pagamento; o saldo é liberado após a confirmação.',
    };
  },
  async verifyWebhook() {
    return null;
  },
};

providers.set(manualProvider.id, manualProvider);

export function registerPaymentProvider(provider: PaymentProvider) {
  if (!/^[a-z0-9_-]{1,30}$/.test(provider.id)) throw new Error('id de provedor inválido');
  providers.set(provider.id, provider);
}

export function getPaymentProvider(id?: string | null): PaymentProvider | null {
  return providers.get(id || defaultProviderId()) ?? null;
}

export function defaultProviderId(): string {
  const id = process.env.MARKETING_PAYMENT_PROVIDER?.trim();
  return id && providers.has(id) ? id : 'manual';
}

export function __resetPaymentProviders() {
  providers.clear();
  providers.set(manualProvider.id, manualProvider);
}
