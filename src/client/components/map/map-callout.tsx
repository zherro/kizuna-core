import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';

export type MapCalloutProps = {
  href: string;
  title?: string;
  subtitle?: string;
  /** aplica o container da home (max-w-[1600px]). Default true; false dentro de uma grade de cartões. */
  contained?: boolean;
};

/** Cartão da home que leva à tela do mapa. Mesmo desenho do `TodayCallout`. */
export function MapCallout({ href, title = 'Mapa', subtitle = 'O que tem perto de você', contained = true }: MapCalloutProps) {
  const link = (
      <Link
        href={href}
        className="group relative isolate flex h-full min-h-24 flex-col items-start justify-center gap-3 overflow-hidden rounded-3xl border border-primary/20 px-4 py-4 lg:flex-row lg:items-center lg:px-5 lg:py-5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:gap-6 lg:px-8 lg:py-6"
        style={{
          backgroundImage:
            'linear-gradient(135deg, color-mix(in oklch, var(--accent) 24%, var(--background)) 0%, color-mix(in oklch, var(--primary) 16%, var(--background)) 100%)',
        }}
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground sm:h-14 sm:w-14">
          <MapPin aria-hidden="true" className="h-6 w-6 sm:h-7 sm:w-7" />
        </span>
        <span className="min-w-0 lg:flex-1">
          <span className="block font-display text-lg font-black leading-tight tracking-tight text-foreground sm:text-xl lg:text-2xl">
            {title}
          </span>
          <span className="mt-0.5 block text-sm text-muted-foreground sm:text-base">{subtitle}</span>
        </span>
        <span className="hidden min-h-11 shrink-0 lg:inline-flex items-center gap-1.5 rounded-full bg-background/80 px-4 text-sm font-bold text-foreground group-hover:bg-background motion-safe:transition-colors">
          Abrir
          <ArrowRight aria-hidden="true" className="h-4 w-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" />
        </span>
      </Link>
  );
  if (!contained) return link;
  return <div className="mx-auto w-full max-w-[1600px] px-4 pb-10 sm:px-6 sm:pb-12">{link}</div>;
}
