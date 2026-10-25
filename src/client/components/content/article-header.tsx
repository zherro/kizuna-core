import type { ReactNode } from 'react';

export type ArticleHeaderProps = {
  /** Linha de contexto acima do título (ex.: "Casa noturna · Cuiabá", ou o chapéu da notícia). */
  kicker?: string;
  /** Cor do texto do kicker (ex.: `kickerTone(kicker).text`); sem ela, a cor da marca. */
  kickerColor?: string;
  /** Cor do marcador quadrado antes do kicker (ex.: `kickerTone(kicker).solid`); sem ela, sem marcador. */
  kickerMarker?: string;
  title: string;
  summary?: string;
  /** Data ISO AAAA-MM-DD. */
  updatedAt?: string;
  /** Linha de metadados abaixo do título (ex.: `ArticleByline`). Vem depois do `updatedAt`. */
  meta?: ReactNode;
};

/** "2026-10-03" → "03/10/2026", sem passar por `Date` (evita deslocar o dia por fuso). */
export function formatDateBR(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export function ArticleHeader({ kicker, kickerColor, kickerMarker, title, summary, updatedAt, meta }: ArticleHeaderProps) {
  return (
    <header>
      {kicker ? (
        <p
          className={`flex items-center gap-2 text-sm font-semibold ${kickerColor ? '' : 'text-brand'}`}
          style={kickerColor ? { color: kickerColor } : undefined}
        >
          {kickerMarker ? (
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: kickerMarker }} />
          ) : null}
          {kicker}
        </p>
      ) : null}
      <h1 className="mt-2 text-balance font-display text-3xl font-black leading-[1.1] tracking-tight text-[var(--foreground-display,var(--foreground))] sm:text-4xl lg:text-5xl">{title}</h1>
      {summary ? <p className="mt-4 max-w-[60ch] text-pretty text-lg leading-7 text-muted-foreground sm:text-xl sm:leading-8">{summary}</p> : null}
      {updatedAt ? (
        <p className="mt-4 text-sm text-muted-foreground">Atualizado em {formatDateBR(updatedAt)}</p>
      ) : null}
      {meta ? <div className="mt-4">{meta}</div> : null}
    </header>
  );
}
