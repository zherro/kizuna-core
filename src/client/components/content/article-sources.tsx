import { Fragment } from 'react';

export type ArticleSource = {
  name: string;
  /** Link da fonte (http/https já validado por quem chama); `null` mostra só o nome. */
  url?: string | null;
};

/**
 * Fecho de uma matéria: "Fonte: X" (ou "Fontes: X, Y e Z"), cada nome com link externo quando
 * houver. Sem fontes → `null`.
 */
export function ArticleSources({ sources }: { sources: ArticleSource[] }) {
  const list = sources.filter((s) => s.name.trim());
  if (list.length === 0) return null;
  return (
    <p className="border-t border-border pt-4 text-sm leading-6 text-muted-foreground">
      <span className="font-semibold text-foreground">{list.length === 1 ? 'Fonte' : 'Fontes'}:</span>{' '}
      {list.map((s, i) => (
        <Fragment key={`${s.name}-${i}`}>
          {i > 0 ? (i === list.length - 1 ? ' e ' : ', ') : null}
          {s.url ? (
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline decoration-brand/50 underline-offset-4 hover:decoration-brand focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {s.name.trim()}
            </a>
          ) : (
            s.name.trim()
          )}
        </Fragment>
      ))}
    </p>
  );
}
