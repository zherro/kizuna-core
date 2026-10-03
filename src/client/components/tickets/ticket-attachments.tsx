import Image from 'next/image';

/** Miniaturas das imagens anexadas (cada uma abre em tamanho real em outra aba). */
export function TicketAttachments({ imageIds = [] }: { imageIds?: string[] }) {
  if (imageIds.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {imageIds.map((id, index) => (
        <li key={id}>
          <a
            href={`/api/storage/files/${id}/content`}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden rounded-lg border border-border bg-muted/20"
          >
            <Image
              src={`/api/storage/files/${id}/content`}
              alt={`Anexo ${index + 1}`}
              width={160}
              height={160}
              className="h-24 w-24 object-cover"
              loading="lazy"
              unoptimized
            />
          </a>
        </li>
      ))}
    </ul>
  );
}
