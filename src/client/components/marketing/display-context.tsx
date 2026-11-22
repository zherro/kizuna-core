'use client';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  formatAmount,
  marketingWords,
  resolveMarketingDisplay,
  type MarketingDisplay,
  type MarketingWords,
  type ResolvedMarketingDisplay,
} from '../../../shared/marketing/display';
import { formatBRL, type PeriodMessageFormat } from '../../../shared/marketing/cost';

export type MarketingDisplayValue = ResolvedMarketingDisplay & {
  /** Centavos → texto na unidade configurada ("R$ 30,00" ou "30 créditos"). */
  money: (cents: number) => string;
  /** Valor a pagar em dinheiro (PIX): igual a `money` em R$; em créditos, "20 créditos (R$ 20,00)". */
  payMoney: (cents: number) => string;
  words: MarketingWords;
  /** Formato das mensagens de validação de período (diária mínima, saldo insuficiente). */
  periodFormat: PeriodMessageFormat;
};

function build(d?: MarketingDisplay): MarketingDisplayValue {
  const r = resolveMarketingDisplay(d);
  const words = marketingWords(r);
  const money = (cents: number) => formatAmount(cents, r.unit);
  const payMoney = (cents: number) => (r.unit === 'credits' ? `${money(cents)} (${formatBRL(cents)})` : formatBRL(cents));
  return { ...r, money, payMoney, words, periodFormat: { money, insufficient: words.insufficient } };
}

const DEFAULT_VALUE = build();
const Ctx = createContext<MarketingDisplayValue>(DEFAULT_VALUE);

/** Configuração de exibição do marketing (unidade, banners, extrato). Sem provider = padrão (Bora). */
export function MarketingDisplayProvider({ value, children }: { value?: MarketingDisplay; children: ReactNode }) {
  // Objeto literal na prop muda a cada render; a chave estável evita recriar o contexto à toa.
  const key = JSON.stringify(value ?? {});
  const built = useMemo(() => build(JSON.parse(key) as MarketingDisplay), [key]);
  return <Ctx.Provider value={built}>{children}</Ctx.Provider>;
}

export function useMarketingDisplay(): MarketingDisplayValue {
  return useContext(Ctx);
}
