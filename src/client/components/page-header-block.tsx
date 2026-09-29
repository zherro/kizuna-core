import { Plus } from 'lucide-react';
import { PageHeader } from './ui-better-soft/headers/page-header';
import { GatedCreateLink } from './gated-create-link';
import { buttonVariants } from './ui/button';
import { cn } from '../../lib/utils';

/**
 * Ação principal "criar" do cabeçalho, em dados (a screen config continua JSON puro). Passa pelo
 * mesmo gate de onboarding / nível de conta do `ListBlock` (`gateUserId`/`gateAction` aceitam
 * refs de contexto como `$session.userId`).
 */
export type PageHeaderCreateAction = {
  href: string;
  label: string;
  gateUserId?: string;
  gateAction?: string;
};

type PageHeaderBlockProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  /** When set, renders a "voltar" link built from this href — no JSX ever comes from screen config. */
  backHref?: string;
  backLabel?: string;
  createAction?: PageHeaderCreateAction;
};

/**
 * Server-safe screen-engine block wrapping `PageHeader` (cataloged in showcase, id `page-header`).
 * Takes only serializable props — the back link and the create action are built here from data,
 * never passed in as JSX, so a screen config can stay plain JSON.
 *
 * `createAction` no mobile vira um botão redondo só com "+" (rótulo em aria-label/title) para caber
 * na mesma linha do título; a partir de `sm` mostra ícone + rótulo.
 */
export function PageHeaderBlock({
  eyebrow,
  title,
  description,
  backHref,
  backLabel,
  createAction,
}: Readonly<PageHeaderBlockProps>) {
  return (
    <PageHeader
      eyebrow={eyebrow}
      title={title}
      description={description}
      backHref={backHref}
      backLabel={backLabel}
      actions={
        createAction ? (
          <GatedCreateLink
            href={createAction.href}
            gateUserId={createAction.gateUserId}
            gateAction={createAction.gateAction}
            className={cn(
              buttonVariants(),
              'h-10 w-10 rounded-full p-0 sm:w-auto sm:rounded-[var(--ui-radius-pill,0.375rem)] sm:px-4'
            )}
          >
            <Plus className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">{createAction.label}</span>
          </GatedCreateLink>
        ) : undefined
      }
    />
  );
}
