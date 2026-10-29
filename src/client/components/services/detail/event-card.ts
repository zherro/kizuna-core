import { eventDateParts, eventDayFromExpiresAt, formatEventExpiry, formatEventWhen } from './evento-helpers';

export type VariantCardProps = {
  cardStyle: 'cinema' | 'evento' | 'lugar';
  ctaLabel: string;
  /** Valor já formatado ("R$ 40,00" / "Gratuito" / "Sob consulta"); `null` omite o preço (cinema). */
  priceLabel: string | null;
  /** Prefixo pequeno do preço ("A partir de"); `null` quando não se aplica. */
  priceCaption: string | null;
  /** Bloco de data (dia + mês abreviado) do evento; `null` sem data. */
  dateLabel: { day: string; month: string } | null;
  /** Data por extenso do evento ("sáb., 14 de nov. · 20:00"); `null` sem data. */
  whenLabel: string | null;
  /** "Local · Cidade" do evento (sempre com a cidade); omitido quando não há nenhum dos dois. */
  locationLabel?: string;
};

/**
 * Mapeia a variant de detalhe da categoria (`resolveServiceDetailVariant`) para as props de
 * `ListingResultCard`. Retorna `null` para variants sem card próprio (`service`/outras): o chamador
 * mantém o comportamento padrão.
 *
 * `expiresAt` = `services.expires_at` (ISO UTC): o "Acontece em" do evento, e a data que o card
 * mostra. Só quando o anúncio não tem validade (ou a RPC é anterior à 0013) o card cai em
 * `startsAt` = `answers.data_inicio` (AAAA-MM-DDTHH:MM); `free` = `answers.gratuito`.
 */
export function variantCardProps(
  variantId: string,
  input: {
    startingPrice?: number | null;
    priceUnit?: string | null;
    free?: boolean;
    startsAt?: string | null;
    /** Validade do anúncio (`services.expires_at`): o "Acontece em" do evento. */
    expiresAt?: string | null;
    /** Nome do local (`service_addresses.label`). */
    venue?: string | null;
    /** Cidade já formatada (`formatLocationLabel`). */
    place?: string | null;
  } = {}
): VariantCardProps | null {
  if (variantId === 'cinema') {
    return { cardStyle: 'cinema', ctaLabel: 'Onde assistir', priceLabel: null, priceCaption: null, dateLabel: null, whenLabel: null };
  }
  if (variantId === 'lugar') {
    // Lugar: sem preço nem "gratuito/pago" — o card só apresenta o lugar.
    return { cardStyle: 'lugar', ctaLabel: 'Ver lugar', priceLabel: null, priceCaption: null, dateLabel: null, whenLabel: null };
  }
  if (variantId === 'noticia') {
    // Notícia: sem preço nem "gratuito/pago". Usa o estilo de card do lugar (capa landscape, sem
    // anunciante nem selo "Novo"). A busca não traz a data de publicação: o card fica sem data.
    return { cardStyle: 'lugar', ctaLabel: 'Ler notícia', priceLabel: null, priceCaption: null, dateLabel: null, whenLabel: null };
  }
  if (variantId === 'evento') {
    // O card do evento mostra a data, não o valor (o valor está no detalhe).
    const where = [input.venue?.trim(), input.place?.trim()].filter(Boolean).join(' · ');
    // "Acontece em" (expires_at) manda; sem ele, a data de início do formulário.
    const day = eventDayFromExpiresAt(input.expiresAt);
    return {
      ...(where ? { locationLabel: where } : {}),
      cardStyle: 'evento',
      ctaLabel: 'Ver evento',
      priceLabel: null,
      priceCaption: null,
      dateLabel: day ? eventDateParts(day) : eventDateParts(input.startsAt),
      whenLabel: day ? formatEventExpiry(input.expiresAt) : formatEventWhen({ data_inicio: input.startsAt }),
    };
  }
  return null;
}
