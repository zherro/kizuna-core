// soft-theme: lê activeTheme (kizuna-core/src/client/lib/ui-theme.ts) — classic/soft via NEXT_PUBLIC_UI_STYLE
import type { ReactNode } from 'react';
import { Typography } from '../../ui/typography';
import { activeTheme } from '../../../lib/ui-theme';
import { cn } from '../../../../lib/utils';

type PageHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  className?: string;
};

/**
 * Heading simples de topo de tela (saudação, sem ações) — diferente de `PageHeader`, que é
 * cabeçalho de página de listagem/gestão com ações à direita.
 * Tamanho/peso do título vêm de `activeTheme`, resolvido por `NEXT_PUBLIC_UI_STYLE`.
 */
export function PageHeading({
  eyebrow,
  title,
  description,
  className,
}: Readonly<PageHeadingProps>) {
  return (
    <div className={className}>
      {eyebrow ? <p className="text-sm font-semibold text-muted-foreground">{eyebrow}</p> : null}
      <Typography.H1
        weight={activeTheme.headingTitleWeight}
        size={activeTheme.headingTitleSize}
        className={cn('leading-[0.95]', eyebrow ? 'mt-1' : undefined)}
      >
        {title}
      </Typography.H1>
      {description ? (
        <div className="mt-2 text-base font-medium text-foreground/70">{description}</div>
      ) : null}
    </div>
  );
}
