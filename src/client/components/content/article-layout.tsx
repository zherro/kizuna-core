import type { ReactNode } from 'react';
import { cn } from '../../../lib/utils';

export type ArticleLayoutProps = {
  header: ReactNode;
  media?: ReactNode;
  /** Faixa de ações rápidas: aparece só abaixo de `lg` (no desktop a lateral já cumpre esse papel). */
  actions?: ReactNode;
  children: ReactNode;
  /** Lateral (informações, mapa, como chegar): fixa ao rolar no desktop, depois do texto no mobile. */
  aside?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

/**
 * Moldura de artigo, só de layout, sem conhecer o conteúdo. É um contêiner simples: o landmark
 * `main` é fornecido pela página (shell do app), então aqui não se renderiza outro. Mobile: coluna única na ordem do DOM
 * (header, media, actions, texto, aside, footer). Desktop: coluna de leitura + lateral fixa.
 */
export function ArticleLayout({
  header,
  media,
  actions,
  children,
  aside,
  footer,
  className,
}: ArticleLayoutProps) {
  return (
    <div className={cn('mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8', className)}>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
        <div className="min-w-0 space-y-6 sm:space-y-8">
          {header}
          {media}
          {actions ? <div className="lg:hidden">{actions}</div> : null}
          <div>{children}</div>
        </div>
        {aside ? (
          <aside className="mt-8 lg:mt-0">
            <div className="space-y-6 lg:sticky lg:top-24">{aside}</div>
          </aside>
        ) : null}
      </div>
      {footer ? <div className="mt-10 border-t border-border pt-4">{footer}</div> : null}
    </div>
  );
}
