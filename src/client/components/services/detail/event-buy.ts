/**
 * Por onde se compra o ingresso de um evento — usado pela barra fixa do celular e pela sidebar.
 * Puro, sem React: testável isolado.
 */
import { parseSalePoints, safeHttpUrl, splitSalePoints, textField, whatsappHref, type EventAnswers } from './evento-helpers';
import type { ServiceSalePoint } from './service-detail-types';

/** Pontos de venda resolvidos pelo servidor quando houver; senão o cru do formulário. */
export function eventSalePoints(salePoints: ServiceSalePoint[] | null | undefined, answers: EventAnswers): ServiceSalePoint[] {
  return (
    salePoints ??
    parseSalePoints(answers.pontos_de_venda).map((p) => ({ label: p.nome, venue: null, ...(p.link ? { link: p.link } : {}) }))
  );
}

/**
 * Link de compra principal: o `link_ingresso` geral; senão o 1º ponto de venda sem lugar cadastrado
 * com link; senão o 1º ponto (com lugar) que tem link próprio.
 */
export function eventBuyUrl(answers: EventAnswers, salePoints: ServiceSalePoint[]): string | null {
  return (
    safeHttpUrl(answers.link_ingresso) ??
    splitSalePoints(salePoints).buyLinks[0]?.href ??
    salePoints.map((p) => safeHttpUrl(p.link)).find((h): h is string => h != null) ??
    null
  );
}

/**
 * WhatsApp escrito na linha "Como comprar" da descrição (o importador guarda assim quando a venda é
 * só por WhatsApp): "**Como comprar:** WhatsApp (65) 9.9953-1935". Só vale com o número logo depois
 * de "WhatsApp" na mesma linha e 10 a 13 dígitos; qualquer outra coisa → null (nunca se supõe).
 */
export function whatsappFromHowToBuy(description: unknown): string | null {
  const text = textField(description);
  if (!text) return null;
  for (const line of text.split(/\r?\n/)) {
    const at = line.search(/como comprar/i);
    if (at < 0) continue;
    const m = line.slice(at).match(/whats\s*app\W{0,6}?(\+?\d[\d\s().-]{8,20}\d)/i);
    if (!m) continue;
    const digits = m[1].replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 13) return m[1].trim();
  }
  return null;
}

/** WhatsApp de compra: o `contato_whatsapp` do formulário; sem ele, o da linha "Como comprar". */
export function eventWhatsapp(answers: EventAnswers, description: unknown): string | null {
  return textField(answers.contato_whatsapp) ?? whatsappFromHowToBuy(description);
}

export type EventBuyAction = { channel: 'purchase' | 'whatsapp'; href: string };

/**
 * Ações da barra de compra: link de compra é a principal (WhatsApp vira secundária); sem link, o
 * WhatsApp é a principal. Evento encerrado ou sem forma de comprar → null (a barra não aparece).
 */
export function eventBuyActions(input: {
  over: boolean;
  buyUrl: string | null;
  whatsapp: string | null;
}): { primary: EventBuyAction; secondary: EventBuyAction | null } | null {
  if (input.over) return null;
  const buy: EventBuyAction | null = input.buyUrl ? { channel: 'purchase', href: input.buyUrl } : null;
  const wa: EventBuyAction | null = input.whatsapp ? { channel: 'whatsapp', href: whatsappHref(input.whatsapp) } : null;
  if (buy) return { primary: buy, secondary: wa };
  if (wa) return { primary: wa, secondary: null };
  return null;
}
