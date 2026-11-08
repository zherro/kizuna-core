import type { ReactNode } from 'react';

export type LandingHeroProps = {
  /** Linha curta acima do título (ex.: "Para pousadas"). */
  eyebrow?: string;
  /** O único h1 da página. */
  title: string;
  summary?: string;
  /** Selos curtos abaixo do resumo (ex.: "Anunciar é gratuito"). */
  badges?: string[];
  /** Botões (normalmente o `WhatsAppButton`). */
  children?: ReactNode;
};

/** Sol sobre o horizonte, no estilo do hero de /hoje. Decorativo. */
function Sun() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 320 160"
      fill="none"
      className="pointer-events-none absolute -right-10 top-0 h-28 w-56 text-primary/45 sm:right-6 sm:h-52 sm:w-[26rem] lg:right-14"
    >
      <path d="M0 150 H320" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 10" />
      <path d="M30 150 A130 130 0 0 1 290 150" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 11" />
      <circle cx="160" cy="20" r="14" fill="currentColor" />
    </svg>
  );
}

/** Abertura das páginas de captação de parceiros: gancho, subtítulo, selos e o botão de contato. */
export function LandingHero({ eyebrow, title, summary, badges, children }: LandingHeroProps) {
  return (
    <header className="mx-auto w-full max-w-[1280px] px-4 pt-4 sm:px-6 sm:pt-6">
      <div
        className="relative isolate overflow-hidden rounded-3xl border border-primary/15 px-5 pb-8 pt-10 sm:px-10 sm:pb-12 sm:pt-16"
        style={{
          backgroundImage:
            'linear-gradient(135deg, color-mix(in oklch, var(--primary) 14%, var(--background)) 0%, color-mix(in oklch, var(--accent) 20%, var(--background)) 100%)',
        }}
      >
        <Sun />
        {eyebrow ? (
          <p className="relative inline-flex min-h-9 items-center rounded-full bg-background/80 px-3.5 text-sm font-bold text-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="relative mt-4 max-w-[20ch] text-balance font-display text-[clamp(2rem,6.5vw,3.75rem)] font-black leading-[1.05] tracking-[-0.025em] text-foreground">
          {title}
        </h1>
        {summary ? (
          <p className="relative mt-4 max-w-[54ch] text-base leading-7 text-muted-foreground sm:text-lg">{summary}</p>
        ) : null}
        {badges?.length ? (
          <ul className="relative mt-4 flex flex-wrap gap-2">
            {badges.map((b) => (
              <li key={b} className="rounded-full bg-background/80 px-3 py-1 text-sm font-semibold text-foreground">
                {b}
              </li>
            ))}
          </ul>
        ) : null}
        {children ? <div className="relative mt-7 flex flex-wrap items-center gap-3">{children}</div> : null}
      </div>
    </header>
  );
}
