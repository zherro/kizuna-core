'use client';

import * as React from 'react';
import { cn } from '../../../lib/utils';

/**
 * CSS/state tooltip (no @radix-ui/react-tooltip in the dependency set).
 * `<Tooltip content={...}>` wraps a trigger; the tip shows on hover/focus.
 */
export function Tooltip({
  content,
  children,
  className,
  side = 'top',
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  side?: 'top' | 'bottom';
}) {
  const [open, setOpen] = React.useState(false);
  if (!content) return <>{children}</>;
  return (
    <span
      className={cn('relative inline-flex items-center', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={cn(
            'pointer-events-none absolute left-1/2 z-50 w-max max-w-xs -translate-x-1/2 rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md',
            side === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
