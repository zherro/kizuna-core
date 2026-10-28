import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { FOCUS_RING } from './turismo-media';

export type TimelineStop = {
  title: string;
  /** Sem `href`, a parada é só texto. */
  href?: string;
  address?: string | null;
  photo?: string | null;
};

/**
 * Linha do tempo das paradas de uma rota, na ordem do percurso. A numeração é real (é uma
 * sequência). Cada parada mostra foto, endereço e link quando existem; sem paradas, não renderiza.
 */
export function StopTimeline({ stops, title = 'Paradas do roteiro' }: { stops: TimelineStop[]; title?: string }) {
  if (stops.length === 0) return null;
  return (
    <section aria-label={title}>
      <h2 className="font-display text-xl font-black tracking-tight sm:text-2xl">{title}</h2>
      <ol className="relative mt-5">
        {stops.map((stop, i) => {
          const last = i === stops.length - 1;
          const body = (
            <>
              {stop.photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- fotos estáticas do conteúdo
                <img
                  src={stop.photo}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-20 w-20 shrink-0 rounded-xl object-cover sm:h-24 sm:w-32"
                />
              ) : null}
              <div className="min-w-0">
                <p className="font-display text-base font-black leading-snug tracking-tight decoration-primary decoration-2 underline-offset-4 group-hover:underline group-focus-visible:underline sm:text-lg">
                  {stop.title}
                </p>
                {stop.address ? (
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                    <MapPin aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>{stop.address}</span>
                  </p>
                ) : null}
              </div>
            </>
          );
          return (
            <li key={`${i}-${stop.title}`} className={`relative flex gap-4 ${last ? '' : 'pb-6'}`}>
              {!last ? (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-[15px] top-8 border-l-2 border-dashed border-primary/40"
                />
              ) : null}
              <span
                aria-hidden="true"
                className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-black text-primary-foreground"
              >
                {i + 1}
              </span>
              {stop.href ? (
                <Link
                  href={stop.href}
                  className={`group -m-1 flex min-w-0 flex-1 items-center gap-4 rounded-2xl p-1 transition-colors hover:bg-muted/60 ${FOCUS_RING}`}
                >
                  {body}
                </Link>
              ) : (
                <div className="flex min-w-0 flex-1 items-center gap-4">{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
