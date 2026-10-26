'use client';

import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { useUserLocation } from '../../hooks/use-user-location';
import { LocationModal } from '../location-modal';
import { useViewingCity } from '../viewing-city';
import { isSameRegion, type RegionConfig } from '../../../shared/regions';

/**
 * Convite discreto quando a URL mostra uma cidade diferente da salva: "Ver mais serviços em
 * Cuiabá" (ou "Escolher minha cidade" sem cidade salva). Abre o seletor em modo de confirmação.
 * Com `regions`, cidade da mesma região (ex.: Cuiabá e Várzea Grande) não conta como diferente:
 * é a mesma praça, não há o que sugerir.
 */
export function CityInvite({ regions = [] }: { regions?: RegionConfig[] } = {}) {
  const { location, ready } = useUserLocation();
  const viewing = useViewingCity();
  const [open, setOpen] = useState(false);

  if (!viewing || !ready) return null;
  if (location && isSameRegion(regions, String(location.cityId), String(viewing.cityId))) return null;

  return (
    <>
      <div className="mx-auto w-full max-w-[1600px] px-4 pt-2 sm:px-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative inline-flex min-h-[28px] items-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground underline-offset-4 transition-colors after:absolute after:inset-x-0 after:-inset-y-2 after:content-[''] hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          {location?.cityName
            ? `Ver mais serviços em ${location.cityName}`
            : 'Escolher minha cidade'}
        </button>
      </div>
      <LocationModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
