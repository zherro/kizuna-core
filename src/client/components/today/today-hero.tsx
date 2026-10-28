import type { ReactNode } from 'react';
import { formatTodayDate } from './today-format';

export type TodayHeroProps = {
  /** Nome da cidade (ou praça) do título: "Hoje em {cidade}". */
  cityName: string;
  summary?: string;
  /** Instante de referência (testes); default agora. */
  now?: Date;
  /** Clima (ex.: `<WeatherWidget />`), ao lado da data. Omitido = sem clima. */
  weather?: ReactNode;
};

/** Arco do sol sobre uma linha de horizonte: o dia passando. Decorativo. */
function SunArc() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 320 160"
      fill="none"
      className="pointer-events-none absolute -right-8 top-0 h-28 w-56 text-primary/45 sm:right-6 sm:h-52 sm:w-[26rem] lg:right-14"
    >
      <path d="M0 150 H320" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 10" />
      <path d="M30 150 A130 130 0 0 1 290 150" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 11" />
      <circle cx="160" cy="20" r="14" fill="currentColor" />
    </svg>
  );
}

/** Abertura da página "Hoje": título com a cidade, a data por extenso e (opcional) o clima. */
export function TodayHero({ cityName, summary, now, weather }: TodayHeroProps) {
  const date = formatTodayDate(now);
  return (
    <header className="mx-auto w-full max-w-[1280px] px-4 pt-4 sm:px-6 sm:pt-6">
      <div
        className="relative isolate overflow-hidden rounded-3xl border border-primary/15 px-5 pb-7 pt-10 sm:px-10 sm:pb-10 sm:pt-16"
        style={{
          backgroundImage:
            'linear-gradient(135deg, color-mix(in oklch, var(--primary) 14%, var(--background)) 0%, color-mix(in oklch, var(--accent) 20%, var(--background)) 100%)',
        }}
      >
        <SunArc />
        <div className="relative flex flex-wrap items-center gap-2">
          <p className="inline-flex min-h-9 items-center rounded-full bg-background/80 px-3.5 text-sm font-bold text-foreground">
            <time className="block first-letter:uppercase">{date}</time>
          </p>
          {weather}
        </div>
        <h1 className="relative mt-4 max-w-[16ch] text-balance font-display text-[clamp(2.25rem,7vw,4.25rem)] font-black leading-[1.02] tracking-[-0.03em] text-foreground">
          Hoje em {cityName}
        </h1>
        {summary ? (
          <p className="relative mt-4 max-w-[52ch] text-base leading-7 text-muted-foreground sm:text-lg">{summary}</p>
        ) : null}
      </div>
    </header>
  );
}
