import { PRICE_UNIT_LABEL } from './service-labels';
import type { ServiceRecord } from './service-type';

/** URL pública do arquivo. `size: 'thumb'` → miniatura (até 640px, para cards/listas); sem
 * miniatura gravada, a rota devolve a imagem grande. */
export function fileUrl(id: string | number, size: 'full' | 'thumb' = 'full') {
  const base = `/api/public/storage/files/${id}/content`;
  return size === 'thumb' ? `${base}?size=thumb` : base;
}

/** Atalho de `fileUrl(id, 'thumb')` — imagem em card, busca, carrossel. */
export function thumbUrl(id: string | number) {
  return fileUrl(id, 'thumb');
}

/** First image url for a service's card/hero — `extras.coverFileId`, falling back to the first of
 * `extras.images`. `services` has no dedicated image columns yet, so both live in `extras`.
 * Shared by the ad detail page and the provider profile page. */
export function coverImage(service: Pick<ServiceRecord, 'extras'>): string | null {
  const images = service.extras?.images;
  const list = Array.isArray(images) ? images : [];
  const coverFileId = service.extras?.coverFileId;
  const cover = coverFileId ?? list[0] ?? null;
  return cover != null && cover !== '' ? fileUrl(cover as string | number) : null;
}

/** Todas as fotos de um serviço (galeria), na ordem `extras.images`; cai pra `[capa]` quando só
 * há `coverFileId`, ou `[]` quando não tem nenhuma. Usado pela tela de detalhe (`AdPhotoMosaic`). */
export function photosFor(service: Pick<ServiceRecord, 'extras'>): string[] {
  const images = service.extras?.images;
  const ids = Array.isArray(images) ? images : [];
  if (ids.length > 0) return ids.map((id) => fileUrl(id as string | number));

  const coverFileId = service.extras?.coverFileId;
  return coverFileId != null && coverFileId !== '' ? [fileUrl(coverFileId as string | number)] : [];
}

export function formatServicePrice(startingPrice: number, priceUnit: string) {
  if (priceUnit === 'quote' || !startingPrice) return 'Sob consulta';

  const amount = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(Number(startingPrice));

  const unitLabel = PRICE_UNIT_LABEL[priceUnit] ?? priceUnit;
  return `${amount} · ${unitLabel}`;
}

/**
 * Preço de card/listagem em duas partes. `unit` ("por unidade") não diz nada ao leitor — o valor
 * do anúncio é sempre o menor preço —, então vira legenda pequena "A partir de" sobre o valor.
 * Demais unidades mantêm o sufixo ("por hora"...); sem preço, "Sob consulta".
 */
export function cardPriceParts(
  price: number | null | undefined,
  priceType: string | null | undefined
): { amount: string; caption: string | null } {
  const value = Number(price ?? 0);
  if (priceType === 'quote' || !(value > 0)) return { amount: 'Sob consulta', caption: null };
  const amount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  if (priceType === 'unit') return { amount, caption: 'A partir de' };
  const unit = PRICE_UNIT_LABEL[priceType ?? ''] ?? '';
  return { amount: unit ? `${amount} ${unit}` : amount, caption: null };
}
