'use client';

import Link from 'next/link';
import { ArrowRight, Flame } from 'lucide-react';
import type { ReactNode } from 'react';

export type DiscoverCtaProps = {
  href?: string;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  /** aplica o container da home (max-w-6xl). Default true. */
  contained?: boolean;
  className?: string;
};

/**
 * Banner-CTA de destaque (gradiente da cor primária) — ex.: "Descobrir no swipe".
 * Tudo tokenizado (`from-primary` / `text-primary-foreground`), sem classe
 * custom. Texto e destino são props. Ligado por env (KIZUNA_HOME_DISCOVER).
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
        className="mt-5 flex items-center gap-4 overflow-hidden rounded-2xl gradient-hero p-5 shadow-lg shadow-primary/20 transition-transform active:scale-[0.99]"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-background/25 text-background">
          <Flame className="h-6 w-6" />
        </span>
        <span className="min-w-0">
          <span className="block font-serif text-lg font-bold text-background">
            Descobrir no swipe
          </span>
          <span className="block text-sm text-background/90">
            Arraste: esse não, esse sim. Monte sua agenda em segundos.
          </span>
        </span>
        <ArrowRight className="ml-auto h-5 w-5 shrink-0 text-background" />
      </Link>
  );

  if (!contained) return link;
  return <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">{link}</div>;
}
