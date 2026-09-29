import { PRICE_UNIT_LABEL } from './service-labels';
import type { ServiceRecord } from './service-type';

export function fileUrl(id: string | number) {
  return `/api/public/storage/files/${id}/content`;
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
