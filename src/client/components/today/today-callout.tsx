import Link from 'next/link';
import { ArrowRight, Sun } from 'lucide-react';
import { formatTodayDate } from './today-format';

export type TodayCalloutProps = {
  href: string;
  now?: Date;
  title?: string;
};

/** Cartão da home que leva à página "Hoje", com a data de hoje. Sempre aparece (a página trata o vazio). */
export function TodayCallout({ href, now, title = 'O que tem pra hoje' }: TodayCalloutProps) {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 pb-10 sm:px-6 sm:pb-12">
      <Link
        href={href}
        className="group relative isolate flex min-h-24 items-center gap-4 overflow-hidden rounded-3xl border border-primary/20 px-5 py-5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:gap-6 sm:px-8 sm:py-6"
        style={{
          backgroundImage:
            'linear-gradient(135deg, color-mix(in oklch, var(--primary) 16%, var(--background)) 0%, color-mix(in oklch, var(--accent) 24%, var(--background)) 100%)',
        }}
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground sm:h-14 sm:w-14">
          <Sun aria-hidden="true" className="h-6 w-6 sm:h-7 sm:w-7" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-xl font-black leading-tight tracking-tight text-foreground sm:text-2xl">
            {title}
          </span>
          <span className="mt-0.5 block text-sm text-muted-foreground first-letter:uppercase sm:text-base">
            <time>{formatTodayDate(now)}</time>
          </span>
        </span>
        <span className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-background/80 px-4 text-sm font-bold text-foreground group-hover:bg-background motion-safe:transition-colors">
          Ver
          <ArrowRight aria-hidden="true" className="h-4 w-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5" />
        </span>
      </Link>
    </div>
  );
}
