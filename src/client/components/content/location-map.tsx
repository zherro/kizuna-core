import { ExternalLink } from 'lucide-react';
import { osmEmbedUrl, osmViewUrl } from '../../../shared/maps';
import { LazyMount } from '../lazy-mount';

/**
 * Mapa incorporado do OpenStreetMap (sem chave, sem biblioteca). O iframe só monta quando a área
 * entra na tela e o navegador está ocioso (`LazyMount`), com a altura reservada para não pular o
 * layout. A página do OpenStreetMap carrega junto — citar na política de privacidade.
 */
export function LocationMap({
  lat,
  lng,
  title,
  height = 280,
}: {
  lat: number;
  lng: number;
  title: string;
  height?: number;
}) {
  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-border bg-muted" style={{ height }}>
        <LazyMount minHeight={height} className="h-full">
          <iframe
            title={`Mapa: ${title}`}
            src={osmEmbedUrl({ lat, lng })}
            className="h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </LazyMount>
      </div>
      <a
        href={osmViewUrl({ lat, lng })}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex min-h-11 items-center gap-1 rounded-sm text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Ver mapa maior (OpenStreetMap)
        <ExternalLink className="h-3 w-3" aria-hidden="true" />
      </a>
    </div>
  );
}
