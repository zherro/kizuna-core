'use client';

import Link from 'next/link';
import { ArrowRight, Flame } from 'lucide-react';
import type { ReactNode } from 'react';

export type DiscoverCtaProps = {
  href?: string;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  /** aplica o container da home (max-w-[1600px]). Default true. */
  contained?: boolean;
  className?: string;
};

/**
 * Banner-CTA de destaque (gradiente da cor primária) — ex.: "Descobrir no swipe".
 * Tudo tokenizado (`from-primary` / `text-primary-foreground`), sem classe
 * custom. Texto e destino são props. Ligado por kizuna.config.json (home.showDiscover).
 */
export function DiscoverCta({
  href = '/descobrir',
  title = 'Descobrir no swipe',
  subtitle = 'Arraste: esse não, esse sim. Monte sua agenda em segundos.',
  icon = <Flame className="h-6 w-6" />,
  contained = true,
  className,
}: DiscoverCtaProps) {
  const link = (
      <Link
        href="/descobrir"
        className={`flex h-full flex-col items-start justify-center gap-3 overflow-hidden rounded-3xl gradient-hero p-4 shadow-lg shadow-primary/20 transition-transform active:scale-[0.99] lg:flex-row lg:items-center lg:gap-4 lg:p-5 ${contained ? "mt-5" : ""}`}
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-background/25 text-background">
          <Flame className="h-6 w-6" />
        </span>
        <span className="min-w-0">
          <span className="block font-serif text-lg font-bold leading-tight text-background">
            Descobrir no swipe
          </span>
          <span className="hidden text-sm text-background/90 sm:block">
            Arraste: esse não, esse sim. Monte sua agenda em segundos.
          </span>
        </span>
        <ArrowRight aria-hidden="true" className="ml-auto hidden h-5 w-5 shrink-0 text-background lg:block" />
      </Link>
  );

  if (!contained) return link;
  return <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6">{link}</div>;
}
