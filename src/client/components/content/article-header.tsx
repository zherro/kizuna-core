export type ArticleHeaderProps = {
  /** Linha de contexto acima do título (ex.: "Casa noturna · Cuiabá"). */
  kicker?: string;
  title: string;
  summary?: string;
  /** Data ISO AAAA-MM-DD. */
  updatedAt?: string;
};

/** "2026-10-03" → "03/10/2026", sem passar por `Date` (evita deslocar o dia por fuso). */
export function formatDateBR(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export function ArticleHeader({ kicker, title, summary, updatedAt }: ArticleHeaderProps) {
  return (
    <header>
      {kicker ? (
        <p className="text-sm font-semibold text-brand">{kicker}</p>
      ) : null}
      <h1 className="mt-2 text-balance font-display text-3xl font-black leading-[1.1] tracking-tight text-foreground sm:text-4xl lg:text-5xl">{title}</h1>
      {summary ? <p className="mt-4 max-w-[60ch] text-pretty text-lg leading-7 text-muted-foreground sm:text-xl sm:leading-8">{summary}</p> : null}
      {updatedAt ? (
        <p className="mt-4 text-sm text-muted-foreground">Atualizado em {formatDateBR(updatedAt)}</p>
      ) : null}
    </header>
  );
}
