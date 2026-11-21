import type { PaymentIntent } from './types';
import type { Purpose } from './purpose';

/** Tipo da cobrança em português (referência, descrição e metadata). */
export type ChargeKind = 'impulsionamento' | 'banner' | 'recarga';

export function chargeKindOf(purpose: Purpose | null): ChargeKind {
  if (purpose?.kind === 'boost') return 'impulsionamento';
  if (purpose?.kind === 'campaign') return 'banner';
  return 'recarga';
}

export type ChargeReferenceConfig = {
  /** `marketing.payments.referencePrefix` do projeto (ex.: `bora`). Sem ele, nada muda. */
  referencePrefix?: string;
  /** Nome exibido na descrição da cobrança (padrão: `site.name`). */
  projectName?: string;
};

/**
 * Campos de conciliação da intent quando o projeto configura um prefixo — vários projetos podem
 * usar a mesma conta do provedor e precisam se reconhecer no extrato:
 *   externalRef  `bora-impulsionamento-<id>`
 *   description  `Bora Cuiabá - impulsionamento #<id>`
 *   metadata     `{ projeto: 'bora', tipo: 'impulsionamento', id: '<id>' }`
 * Sem prefixo válido devolve `{}` (o provedor usa o comportamento de sempre).
 */
export function projectChargeFields(
  intentId: string,
  purpose: Purpose | null,
  cfg: ChargeReferenceConfig | undefined
): Pick<PaymentIntent, 'externalRef' | 'description' | 'metadata'> {
  const prefix = (cfg?.referencePrefix ?? '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{0,15}$/.test(prefix)) return {};
  const tipo = chargeKindOf(purpose);
  const name = (cfg?.projectName ?? '').trim();
  return {
    externalRef: `${prefix}-${tipo}-${intentId}`,
    // Hífen simples: a API do AbacatePay recusa o travessão (U+2014) na descrição.
    description: `${name || prefix} - ${tipo} #${intentId}`,
    metadata: { projeto: prefix, tipo, id: intentId },
  };
}
