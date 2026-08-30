import type { ReactNode } from 'react';
import { Grid } from '../../ui/grid';
import { Typography } from '../../ui/typography';
import { SectionLabel } from '../../ui/label';
import { cn } from '../../../../lib/utils';

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

/**
 * List/manager page header: eyebrow + title + description on the left,
 * actions (back link, primary action…) on the right, laid out on the
 * app's 12-col `Grid` so it stacks cleanly at every breakpoint instead of
 * only flipping once at `md`.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: Readonly<PageHeaderProps>) {
  return (
    <Grid
      container
      containerSize="fluid"
      padding="none"
      gap={3}
      className={cn('items-end', className)}
    >
      <Grid xs={12} sm={9} md={9} lg={8}>
        {eyebrow ? <SectionLabel>{eyebrow}</SectionLabel> : null}
        <Typography.H2>{title}</Typography.H2>
        {description ? (
          <Typography.P className="text-muted-foreground">{description}</Typography.P>
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
