import { DirectionsCard, LocationMap } from '../../content';
import type { ServiceLocation } from '../../../../server/services/service-detail-data';
import { hueGradient } from './category-style';

/** Seção "Localização" do detalhe do anúncio: mapa (só com coordenadas) + endereço e "Como chegar". */
export function ServiceLocationSection({
  location,
  title,
  hue,
  placeMode = false,
}: {
  location: ServiceLocation | null;
  title: string;
  hue: number;
  /** Página de um LUGAR: mede a distância já ao abrir e oferece compartilhar a localização. */
  placeMode?: boolean;
}) {
  if (!location) return null;
  const { address, lat, lng, label } = location;
  const destination = lat != null && lng != null ? { lat, lng } : null;

  return (
    <section className="mt-10 border-t border-border pt-8">
      <h2 className="flex items-center gap-3 font-display text-xl font-black tracking-tight">
        <span className="h-5 w-1 shrink-0 rounded-full" style={{ backgroundImage: hueGradient(hue) }} />
        Localização
      </h2>
      <div className="mt-5 space-y-4">
        {destination && <LocationMap lat={destination.lat} lng={destination.lng} title={label || title} />}
        <DirectionsCard
          destination={destination}
          address={address || null}
          measure={placeMode || !destination}
          autoLocate={placeMode}
          shareTitle={placeMode ? label || title : null}
        />
      </div>
    </section>
  );
}
