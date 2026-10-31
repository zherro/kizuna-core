import Image from 'next/image';
import { Camera, MapPin, Tag } from 'lucide-react';
import { SERVICE_LOCATION_LABEL, formatServicePrice } from './service-type';

/** Resumo do que já foi preenchido nos passos anteriores. Dois usos:
 *  - `compact`: cartão fino — fixo no trilho lateral (desktop) e acima do conteúdo (mobile).
 *  - completo (default): mini-preview no passo de Descrição, com as fotos em quadradinhos. */
export function ServiceConfigSummary({
  groupName,
  categoryName,
  subcategoryNames,
  title,
  serviceLocation,
  startingPrice,
  priceUnit,
  imageIds = [],
  compact = false,
}: {
  groupName?: string;
  categoryName?: string;
  subcategoryNames: string[];
  title: string;
  serviceLocation: string;
  startingPrice: number;
  priceUnit: string;
  imageIds?: string[];
  compact?: boolean;
}) {
  const hasLocation = Boolean(serviceLocation);
  const locationLabel =
    SERVICE_LOCATION_LABEL[serviceLocation as keyof typeof SERVICE_LOCATION_LABEL] ?? 'A definir';
  const hasPrice = priceUnit === 'quote' || startingPrice > 0;
  const priceLabel = formatServicePrice(startingPrice, priceUnit || 'quote');
  const context = [groupName, categoryName].filter(Boolean).join(' · ');

  if (compact) {
    return (
      <div className="rounded-xl bg-muted/50 p-3.5 text-sm">
        <p className="text-xs font-medium text-muted-foreground">Resumo do anúncio</p>
        <p className="mt-1.5 font-semibold leading-snug text-foreground">
          {title || 'Sem título ainda'}
        </p>
        {context ? <p className="mt-0.5 text-xs text-muted-foreground">{context}</p> : null}

        {subcategoryNames.length > 0 ? (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
            <Tag className="mt-0.5 h-3 w-3 shrink-0" />
            <span>
              {subcategoryNames.slice(0, 3).join(', ')}
              {subcategoryNames.length > 3 ? ` +${subcategoryNames.length - 3}` : ''}
            </span>
          </p>
        ) : null}

        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          {hasPrice ? <p className="font-medium text-foreground">{priceLabel}</p> : null}
          {hasLocation ? (
            <p className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 shrink-0" /> {locationLabel}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="border-b border-border bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
        Prévia do anúncio
      </div>

      <div className="space-y-3 p-4">
        {imageIds.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {imageIds.map((id, index) => (
              <div
                key={id}
                className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border"
              >
                <Image
                  src={`/api/storage/files/${id}/content`}
                  alt={`Foto ${index + 1}`}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-16 items-center gap-2 rounded-lg border border-dashed border-border px-3 text-xs text-muted-foreground">
            <Camera className="h-4 w-4" /> Sem fotos
          </div>
        )}

        <div>
          {context ? <p className="text-xs text-muted-foreground">{context}</p> : null}
          <p className="font-display text-lg font-semibold leading-tight text-foreground">
            {title || 'Sem título'}
          </p>
        </div>

        {subcategoryNames.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {subcategoryNames.map((name) => (
              <span key={name} className="rounded-full bg-muted px-2.5 py-1 text-xs">
                {name}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> {locationLabel}
          </span>
          <span className="font-semibold text-foreground">{priceLabel}</span>
        </div>
      </div>
    </div>
  );
}
