import Link from 'next/link';
import { CalendarSearch } from 'lucide-react';

export type TodayEmptyProps = {
  href?: string;
  className?: string;
};

/** Nenhuma seção com item: em vez de página em branco, convida a buscar. */
export function TodayEmpty({ href = '/busca', className }: TodayEmptyProps) {
  return (
    <section
      aria-labelledby="today-empty-title"
      className={`mx-auto my-10 flex w-[calc(100%-2rem)] max-w-[1280px] flex-col items-center rounded-3xl border border-dashed border-primary/30 bg-primary/5 px-6 py-12 text-center sm:w-[calc(100%-3rem)] ${className ?? ''}`}
    >
      <span className="grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-primary">
        <CalendarSearch aria-hidden="true" className="h-7 w-7" />
      </span>
      <h2 id="today-empty-title" className="mt-5 font-display text-xl font-black tracking-tight">
        Ainda não temos nada marcado para hoje
      </h2>
      <p className="mt-2 max-w-[44ch] text-sm leading-6 text-muted-foreground">
        A agenda do dia é atualizada com frequência. Busque eventos, lugares e passeios para outros dias.
      </p>
      <Link
        href={href}
        className="mt-6 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Buscar no Bora
      </Link>
    </section>
  );
}
