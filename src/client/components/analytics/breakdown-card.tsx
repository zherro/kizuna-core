import type { ReactNode } from 'react';
import { formatMetric } from '../../../shared/analytics/metrics';

const int = (n: number) => n.toLocaleString('pt-BR');

/** Cartão dos blocos de métricas (mesma moldura do bloco de origens). */
export function BreakdownCard({
  title,
  hint,
  empty,
  children,
}: {
  title: string;
  hint?: string;
  /** Texto do estado vazio; quando presente, substitui o conteúdo. */
  empty?: string | null;
  children?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="px-4 pt-4 md:px-6 md:pt-6">
        <h2 className="text-sm font-semibold">{title}</h2>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {empty ? (
        <p className="px-4 pb-6 pt-3 text-sm text-muted-foreground md:px-6">{empty}</p>
      ) : (
        <div className="mt-3">{children}</div>
      )}
    </section>
  );
}

export type ShareItem = { key: string; label: string; views: number; share: number };

/**
 * Lista de participação: rótulo, views e percentual em texto; a barra é só reforço visual.
 * O percentual vem arredondado do agregador e é mostrado como veio (a soma pode não dar 100).
 */
export function ShareList({ items, label }: { items: ShareItem[]; label: string }) {
  return (
    <ul role="list" aria-label={label} className="flex flex-col gap-3 px-4 pb-4 md:px-6 md:pb-6">
      {items.map((it) => (
        <li key={it.key} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span title={it.label} className="min-w-0 truncate font-medium">{it.label}</span>
            <span className="shrink-0 tabular-nums">
              <span className="text-muted-foreground">
                {int(it.views)} {it.views === 1 ? 'view' : 'views'}
              </span>
              <span className="ml-2 inline-block min-w-[3ch] text-right font-semibold">{formatMetric('percent', it.share)}</span>
            </span>
          </div>
          <div aria-hidden="true" className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max(0, Math.min(100, it.share))}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
