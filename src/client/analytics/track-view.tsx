'use client';

import type { ReactNode } from 'react';
import { useTrackView, type TrackViewOptions } from './use-track-view';

/** Envolve um bloco e conta quando ele fica visível pelo tempo configurado. */
export function TrackView({
  children,
  className,
  ...opts
}: TrackViewOptions & { children: ReactNode; className?: string }) {
  const ref = useTrackView(opts);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
