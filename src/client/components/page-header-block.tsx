import Link from 'next/link';
import { buttonVariants } from './ui/button';
import { AdminPageReader } from './ui-better-soft/headers/admin-page-reader';
import { PageHeader } from './ui-better-soft/headers/page-header';

type PageHeaderBlockProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  /** When set, renders a "voltar" link built from this href — no JSX ever comes from screen config. */
  backHref?: string;
  backLabel?: string;
  /**
   * `'default'` (compact grid header, most screens) or `'admin-reader'` (bold title + back-arrow
   * chip, the /painel/agenda/feriados look — this app's card-page standard). Optional per-screen
   * config, exactly the kind of "screen builder optional setting" this engine exists for — see
   * .claude/libs/screen-engine.md. Omit for `'default'`.
   */
  variant?: 'default' | 'admin-reader';
};

/**
 * Server-safe screen-engine block wrapping either `PageHeader` (already cataloged in showcase, id
 * `page-header`) or, when `variant: 'admin-reader'`, `AdminPageReader`. Takes only serializable
 * props — the back link is built here from `backHref`, never passed in as JSX, so a screen config
 * can stay plain JSON.
 */
export function PageHeaderBlock({
  eyebrow,
  title,
  description,
  backHref,
  backLabel,
  variant = 'default',
}: Readonly<PageHeaderBlockProps>) {
  if (variant === 'admin-reader') {
    return (
      <AdminPageReader
        title={title}
        description={description}
        backHref={backHref}
        backLabel={backLabel}
        // RenderScreen already spaces blocks with its own gap-6 — cancel AdminPageReader's
        // built-in mb-6 so the header isn't double-spaced from the block below it.
        className="mb-0"
      />
    );
  }

  return (
    <PageHeader
      eyebrow={eyebrow}
      title={title}
      description={description}
      actions={
        backHref ? (
          <Link href={backHref} className={buttonVariants({ variant: 'outline' })}>
            {backLabel ?? 'Voltar ao painel'}
          </Link>
        ) : null
      }
    />
  );
}
