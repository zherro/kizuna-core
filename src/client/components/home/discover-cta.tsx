'use client';

import Link from 'next/link';
import { ArrowRight, Flame } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../../lib/utils';

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
      href={href}
      className={cn(
        'flex items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/70 p-5 shadow-lg shadow-primary/20 transition-transform active:scale-[0.99]',
        className
      )}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-background/25 text-primary-foreground">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-bold text-primary-foreground">{title}</span>
        <span className="block text-sm text-primary-foreground/90">{subtitle}</span>
      </span>
      <ArrowRight className="ml-auto h-5 w-5 shrink-0 text-primary-foreground" />
    </Link>
  );

  if (!contained) return link;
  return <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">{link}</div>;
}
