import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { buttonVariants } from '../../ui/button';
import { Typography } from '../../ui/typography';
import { cn } from '../../../../lib/utils';

type AdminPageReaderProps = {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  className?: string;
};

export function AdminPageReader({
  title,
  description,
  backHref = '/painel',
  backLabel = 'Ir ao painel',
  actions,
  className,
}: Readonly<AdminPageReaderProps>) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        {backHref ? (
          <Link
            href={backHref}
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'mb-2 -ml-2 h-8 gap-1 text-muted-foreground'
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        ) : null}
        {/* Per-breakpoint size/weight is fixed inside Typography (DEFAULT_SIZE/DEFAULT_WEIGHT in
            typography.tsx) — never re-declare a responsive text-* scale or a heavier weight on a
            page header here. H2's own default (semibold) reads more elegant than bold. */}
        <Typography.H2>{title}</Typography.H2>
        {description ? (
          <Typography.P color="muted" className="mt-1 max-w-2xl">
            {description}
          </Typography.P>
        ) : null}
      </div>

      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
