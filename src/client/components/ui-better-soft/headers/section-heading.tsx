import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../../../lib/utils/cn';

/**
 * Cabeçalho de seção das páginas de conteúdo (home: categorias, trilhas, notícias, lugares): barra
 * de acento + título + link opcional à direita. Um só lugar para tamanho, peso e respiro, para as
 * seções se distinguirem umas das outras do mesmo jeito em todos os blocos.
 */

/** Classes do título de seção (para quem precisa do mesmo visual sem o componente). */
export const SECTION_TITLE_CLASS =
  'font-display text-2xl font-extrabold leading-[1.15] tracking-tight text-[var(--foreground-display)] sm:text-[1.75rem]';

export type SectionHeadingProps = {
  title: ReactNode;
  /** `id` do título, para `aria-labelledby` da seção. */
  id?: string;
  /** Linha curta abaixo do título. */
  subtitle?: ReactNode;
  /** CSS `background` da barra (cor ou gradiente). Default: `var(--primary)`. */
  accent?: string;
  /** Link "Ver todos" (ver `SectionHeadingLink`) ou outro controle à direita. */
  action?: ReactNode;
  as?: 'h2' | 'h3';
  /** Mesclada com tailwind-merge: dá para trocar o respiro de baixo (ex. `mb-0`). */
  className?: string;
};

export function SectionHeading({
  title,
  id,
  subtitle,
  accent = 'var(--primary)',
  action,
  as: Tag = 'h2',
  className = '',
}: SectionHeadingProps) {
  return (
    <div className={cn('mb-6 flex items-end justify-between gap-4', className)}>
      <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden="true" className="h-7 w-1.5 shrink-0 self-center rounded-full sm:h-8" style={{ background: accent }} />
        <div className="min-w-0">
          <Tag id={id} className={SECTION_TITLE_CLASS}>
            {title}
          </Tag>
          {subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

/** "Ver todos" padrão do `SectionHeading`: alvo de 44px, foco visível. */
export function SectionHeadingLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="-mr-2 inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-full px-3 text-sm font-semibold text-primary outline-none transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
      <ChevronRight aria-hidden="true" className="h-4 w-4" />
    </Link>
  );
}
