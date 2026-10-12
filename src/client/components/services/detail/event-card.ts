import { eventDateParts, eventPriceInfo } from './evento-helpers';

export type VariantCardProps = {
  cardStyle: 'cinema' | 'evento';
  ctaLabel: string;
  /** Valor já formatado ("R$ 40,00" / "Gratuito" / "Sob consulta"); `null` omite o preço (cinema). */
  priceLabel: string | null;
  /** Prefixo pequeno do preço ("A partir de"); `null` quando não se aplica. */
  priceCaption: string | null;
  /** Bloco de data (dia + mês abreviado) do evento; `null` sem data. */
  dateLabel: { day: string; month: string } | null;
};

/**
 * Mapeia a variant de detalhe da categoria (`resolveServiceDetailVariant`) para as props de
 * `ListingResultCard`. Retorna `null` para variants sem card próprio (`service`/outras): o chamador
 * mantém o comportamento padrão.
 *
 * `startsAt` = `answers.data_inicio` (AAAA-MM-DDTHH:MM) quando a listagem o tiver; `free` =
 * `answers.gratuito`.
 */
export function variantCardProps(
  variantId: string,
  input: {
    startingPrice?: number | null;
    priceUnit?: string | null;
    free?: boolean;
    startsAt?: string | null;
  } = {}
): VariantCardProps | null {
  if (variantId === 'cinema') {
    return { cardStyle: 'cinema', ctaLabel: 'Onde assistir', priceLabel: null, priceCaption: null, dateLabel: null };
  }
  if (variantId === 'evento') {
    const price = eventPriceInfo({
      free: input.free,
      startingPrice: input.startingPrice,
      priceUnit: input.priceUnit,
    });
    return {
      cardStyle: 'evento',
      ctaLabel: 'Ver evento',
      priceLabel: price.amount,
      priceCaption: price.caption,
      dateLabel: eventDateParts(input.startsAt),
    };
  }
  return null;
}
