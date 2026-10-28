import Link from 'next/link';
import { Children, useId, type ReactNode } from 'react';
import { FOCUS_RING } from './turismo-media';

/**
 * Seção da entrada de turismo: título, descrição curta, "Ver todos" e os cartões. No celular os
 * cartões rolam na horizontal (um quase inteiro + um pedaço do próximo); do tablet para cima viram
 * grade de 2, 3 e 4 colunas, no mesmo container de 1280px da home. Sem filhos, não renderiza nada.
 */
export function TurismoSection({
  title,
  description,
  moreHref,
  moreLabel = 'Ver todos',
  children,
}: {
  title: string;
  description?: string;
  moreHref?: string;
  moreLabel?: string;
  children: ReactNode;
}) {
  const headingId = useId();
  const items = Children.toArray(children);
  if (items.length === 0) return null;
  return (
    <section aria-labelledby={headingId} className="mx-auto w-full max-w-[1280px] px-4 pt-10 sm:px-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="h-5 w-1 shrink-0 rounded-full bg-primary" />
            <h2 id={headingId} className="font-display text-xl font-black leading-tight tracking-tight sm:text-2xl">
              {title}
            </h2>
          </div>
          {description ? <p className="mt-1 max-w-[60ch] text-sm leading-6 text-muted-foreground">{description}</p> : null}
        </div>
        {moreHref ? (
          <Link
            href={moreHref}
            className={`-mr-3 inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-semibold text-primary transition-colors hover:bg-muted ${FOCUS_RING}`}
          >
            {moreLabel}
          </Link>
        ) : null}
      </div>
      <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3 xl:grid-cols-4 [&::-webkit-scrollbar]:hidden">
        {items.map((child, i) => (
          <li key={i} className="w-[76%] shrink-0 snap-start sm:w-auto">
            {child}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Grade das páginas de lista (sem rolagem lateral): 1, 2, 3 e 4 colunas. */
export function TurismoGrid({ children }: { children: ReactNode }) {
  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Children.toArray(children).map((child, i) => (
        <li key={i}>{child}</li>
      ))}
    </ul>
  );
}
