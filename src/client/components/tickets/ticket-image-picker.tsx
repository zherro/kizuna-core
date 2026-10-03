'use client';

import { ImageGalleryManager } from '../storage/image-gallery-manager';

export const TICKET_MAX_IMAGES = 3;
const NO_IDS: string[] = [];

/**
 * Seleção de até 3 imagens para um chamado/comentário/resposta. Faz o upload na hora
 * (purpose `ticket_attachment`) e devolve os ids por `onChange`; quem usa grava os ids junto com o
 * texto. Para limpar depois de enviar, remonte com outro `key`.
 */
export function TicketImagePicker({ onChange }: { onChange: (imageIds: string[]) => void }) {
  return (
    <ImageGalleryManager
      referenceId="ticket-draft"
      initialImageIds={NO_IDS}
      purpose="ticket_attachment"
      maxFiles={TICKET_MAX_IMAGES}
      maxFileSizeMb={5}
      description={`Opcional: até ${TICKET_MAX_IMAGES} imagens (JPG, PNG, GIF, HEIC ou WEBP, até 5 MB cada).`}
      onPersist={async (_referenceId, imageIds) => imageIds}
      onSaved={onChange}
    />
  );
}
