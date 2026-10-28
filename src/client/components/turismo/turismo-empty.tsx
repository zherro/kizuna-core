import Link from 'next/link';
import { Compass } from 'lucide-react';
import { FOCUS_RING } from './turismo-media';

export type TurismoEmptyProps = {
  title?: string;
  description?: string;
  /** Para onde levar quem chegou numa lista vazia (ex.: a entrada de turismo). */
  actionHref?: string;
  actionLabel?: string;
  className?: string;
};

/** Lista sem conteúdo publicado: convida a seguir adiante em vez de mostrar uma página em branco. */
export function TurismoEmpty({
  title = 'Estamos preparando esta seção',
  description = 'O conteúdo está sendo apurado e revisado. Volte em breve ou descubra outros lugares agora.',
  actionHref,
  actionLabel = 'Ver outros lugares',
  className,
}: TurismoEmptyProps) {
  return (
    <div
      className={`flex flex-col items-center rounded-3xl border border-dashed border-primary/30 bg-primary/5 px-6 py-12 text-center ${className ?? ''}`}
    >
      <span className="grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-primary">
        <Compass aria-hidden="true" className="h-7 w-7" />
      </span>
      <h2 className="mt-5 font-display text-xl font-black tracking-tight">{title}</h2>
      <p className="mt-2 max-w-[44ch] text-sm leading-6 text-muted-foreground">{description}</p>
      {actionHref ? (
        <Link
          href={actionHref}
          className={`mt-6 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 ${FOCUS_RING}`}
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
