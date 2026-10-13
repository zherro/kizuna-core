import { eventDateParts, formatEventWhen } from './evento-helpers';

export type VariantCardProps = {
  cardStyle: 'cinema' | 'evento';
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
    /** Nome do local (`service_addresses.label`). */
    venue?: string | null;
    /** Cidade já formatada (`formatLocationLabel`). */
    place?: string | null;
  } = {}
): VariantCardProps | null {
  if (variantId === 'cinema') {
    return { cardStyle: 'cinema', ctaLabel: 'Onde assistir', priceLabel: null, priceCaption: null, dateLabel: null, whenLabel: null };
  }
  if (variantId === 'evento') {
    // O card do evento mostra a data, não o valor (o valor está no detalhe).
    const where = [input.venue?.trim(), input.place?.trim()].filter(Boolean).join(' · ');
    return {
      ...(where ? { locationLabel: where } : {}),
      cardStyle: 'evento',
      ctaLabel: 'Ver evento',
      priceLabel: null,
      priceCaption: null,
      dateLabel: eventDateParts(input.startsAt),
      whenLabel: formatEventWhen({ data_inicio: input.startsAt }),
    };
  }
  return null;
}
