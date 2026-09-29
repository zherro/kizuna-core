// soft-theme: escala do título por ACTIVE_UI_STYLE (kizuna-core/src/client/lib/ui-theme.ts) — classic/soft via NEXT_PUBLIC_UI_STYLE
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
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
  /** Botão "voltar" redondo (só ícone; `backLabel` vira aria-label/tooltip). Omita para não renderizar — sem href padrão. */
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  className?: string;
};

/**
 * List/manager page header. Composição enxuta: o "voltar" é um botão redondo só com ícone (no tom
 * escuro da cor primária do tema) alinhado ao bloco de texto — eyebrow, título e descrição numa
 * coluna só —, e as ações ficam à direita no desktop / embaixo no mobile. Fecha com um traço fino
 * em degradê a partir da primária, em vez de uma borda cheia, para separar do conteúdo sem pesar.
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
    <header className={cn('pb-6', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          {backHref ? (
            <Link
              href={backHref}
              aria-label={backLabel}
              title={backLabel}
              className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--primary)_75%,black)] text-primary-foreground shadow-[shadow:var(--ui-shadow-item,0_0_#0000)] transition-[background-color,transform] hover:-translate-x-0.5 hover:bg-[color-mix(in_oklab,var(--primary)_65%,black)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          ) : null}
          <div className="min-w-0 space-y-1">
            {eyebrow ? <SectionLabel>{eyebrow}</SectionLabel> : null}
            <Typography.H2
              size={PAGE_HEADER_TITLE[ACTIVE_UI_STYLE].size}
              weight={PAGE_HEADER_TITLE[ACTIVE_UI_STYLE].weight}
              className="leading-tight"
            >
              {title}
            </Typography.H2>
            {description ? (
              <Typography.P color="muted" className="max-w-2xl text-sm">
                {description}
              </Typography.P>
            ) : null}
          </div>
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">{actions}</div>
        ) : null}
      </div>
      <div
        aria-hidden="true"
        className="mt-6 h-px bg-gradient-to-r from-primary/50 via-border to-transparent"
      />
    </header>
  );
}
