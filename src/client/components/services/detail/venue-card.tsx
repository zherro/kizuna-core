import Link from 'next/link';
import { ChevronRight, MapPin } from 'lucide-react';
import type { ServiceVenue } from '../../../../server/services/service-detail-data';
import { Section } from './service-detail-cinema';

/**
 * "Onde acontece" — o local do evento (anúncio da variant `lugar`) como um cartão-link: foto,
 * nome, endereço e cidade levam à página do local. A faixa lateral usa o hue da categoria do
 * evento; sem foto, um bloco tingido com o pino ocupa o lugar dela.
 */
export function VenueCard({ venue, hue, title = 'Onde acontece' }: { venue: ServiceVenue; hue: number; title?: string }) {
  const tint = `hsl(${hue} 70% 50% / 0.14)`;
  return (
    <Section title={title} hue={hue}>
      <Link
        href={venue.href}
        className="group flex items-stretch gap-4 overflow-hidden rounded-[var(--ui-radius-card,1rem)] border-[length:var(--ui-border-w-card,1px)] border-border bg-card p-3 shadow-[shadow:var(--ui-shadow-item,0_0_#0000)] transition-colors hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <div
          className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[calc(var(--ui-radius-card,1rem)-0.25rem)] sm:h-24 sm:w-28"
          style={{ backgroundColor: tint }}
        >
          {venue.photo ? (
            <img src={venue.photo} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <MapPin aria-hidden className="absolute inset-0 m-auto h-7 w-7" style={{ color: `hsl(${hue} 70% 45%)` }} />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div className="font-display text-lg font-black leading-tight group-hover:text-brand">{venue.title}</div>
          {venue.address && <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{venue.address}</div>}
          {venue.cityName && <div className="mt-0.5 text-xs font-semibold text-muted-foreground">{venue.cityName}</div>}
        </div>
        <ChevronRight aria-hidden className="h-5 w-5 shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </Link>
    </Section>
  );
}
