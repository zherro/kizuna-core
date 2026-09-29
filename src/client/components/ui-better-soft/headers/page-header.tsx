// soft-theme: escala do título por ACTIVE_UI_STYLE (kizuna-core/src/client/lib/ui-theme.ts) — classic/soft via NEXT_PUBLIC_UI_STYLE
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Grid } from '../../ui/grid';
import { Typography } from '../../ui/typography';
import { SectionLabel } from '../../ui/label';
import { buttonVariants } from '../../ui/button';
import { ACTIVE_UI_STYLE } from '../../../lib/ui-theme';
import { cn } from '../../../../lib/utils';

/** Escala fluida do `Typography` por estilo — tipografia não é token CSS, então fica no componente. */
const PAGE_HEADER_TITLE = {
  classic: { size: 'xl', weight: 'semibold' },
  soft: { size: '2xl', weight: 'normal' },
} as const;

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  /** Compact "voltar" link (arrow + label) above the eyebrow. Omit to render nothing — no implicit default href. */
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  className?: string;
};

/**
 * List/manager page header: eyebrow + title + description on the left,
 * actions (back link, primary action…) on the right, laid out on the
 * app's 12-col `Grid` so it stacks cleanly at every breakpoint instead of
 * only flipping once at `md`. Always closes with a bottom divider + padding
 * to separate it from the content below — a header should never sit flush
 * against the next block.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  backHref,
  backLabel = 'Ir ao painel',
  actions,
  className,
}: Readonly<PageHeaderProps>) {
  return (
    <Grid
      container
      containerSize="fluid"
      padding="none"
      gap={3}
      className={cn('items-end border-b border-border pb-6', className)}
    >
      <Grid xs={12} sm={9} md={9} lg={8}>
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
        {eyebrow ? <SectionLabel>{eyebrow}</SectionLabel> : null}
        <Typography.H2
          size={PAGE_HEADER_TITLE[ACTIVE_UI_STYLE].size}
          weight={PAGE_HEADER_TITLE[ACTIVE_UI_STYLE].weight}
        >
          {title}
        </Typography.H2>
        {description ? (
          <Typography.P color="muted">{description}</Typography.P>
        ) : null}
      </Grid>

      {actions ? (
        <Grid xs={12} sm={3} md={3} lg={4} className="flex flex-wrap gap-2 justify-end">
          {actions}
        </Grid>
      ) : null}
    </Grid>
  );
}
