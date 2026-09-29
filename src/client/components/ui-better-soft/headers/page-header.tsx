// soft-theme: escala do título por ACTIVE_UI_STYLE (kizuna-core/src/client/lib/ui-theme.ts) — classic/soft via NEXT_PUBLIC_UI_STYLE
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Grid } from '../../ui/grid';
import { Typography } from '../../ui/typography';
import { SectionLabel } from '../../ui/label';
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
  /** Botão "voltar" (invertido, seta + rótulo) na mesma linha do eyebrow. Omita para não renderizar — sem href padrão. */
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
        {backHref || eyebrow ? (
          <div className="mb-2 flex flex-wrap items-center gap-3">
            {backHref ? (
              <Link
                href={backHref}
                className="inline-flex h-8 items-center gap-1.5 rounded-[var(--ui-radius-pill,0.375rem)] bg-foreground px-3 font-display text-xs font-semibold tracking-wide text-background transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {backLabel}
              </Link>
            ) : null}
            {eyebrow ? <SectionLabel>{eyebrow}</SectionLabel> : null}
          </div>
        ) : null}
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
