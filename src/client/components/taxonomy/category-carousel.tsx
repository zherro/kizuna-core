'use client';

import { useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import { Tag } from 'lucide-react';
import { useResourceOptions } from '../../hooks';

type StatRow = {
  id: string | number;
  categoryId: string | number;
  categoryName?: string;
  name?: string;
  qtd?: number;
};

export type CategoryCarouselItem = {
  id: number;
  name: string;
  /** nº de subcategorias ativas na categoria (do stats view) */
  count: number;
};

export type CategoryCarouselProps = {
  variant?: 'classic' | 'compact';
  /** Recurso a buscar (default 'category_stats' — só categorias com subcategoria ativa). */
  resource?: string;
  title?: string;
  /** Link "ver todas". Se ausente, não renderiza o link. */
  allLabel?: string;
  allHref?: string;
  /** href de cada card. Default: `/busca?categoryId=<id>`. */
  hrefFor?: (item: CategoryCarouselItem) => string;
  /** ícone de cada card. Default: <Tag />. */
  iconFor?: (item: CategoryCarouselItem) => ReactNode;
  /** label do contador (compact esconde). Default: `(n) => \`${n} subcategorias\``. */
  countLabel?: (count: number) => string;
  className?: string;
};

/**
 * Carrossel de categorias com DADOS REAIS — busca a taxonomia do projeto
 * (`vw_category_subcategory_stats` do plugin taxonomy) e mostra só as categorias
 * que têm conteúdo. Duas caras: `classic` (cards largos com contador) e
 * `compact` (cards verticais pequenos com ícone em círculo). Tudo tokenizado.
 *
 * Uso:
 *   <CategoryCarousel variant="compact" title="Categorias" allHref="/busca" allLabel="Ver todas" />
 */
export function CategoryCarousel({
  variant = 'classic',
  resource = 'category_stats',
  title = 'Categorias',
  allLabel,
  allHref,
  hrefFor = (c) => `/busca?categoryId=${c.id}`,
  iconFor = () => <Tag className="h-5 w-5" />,
  countLabel = (n) => `${n} ${n === 1 ? 'subcategoria' : 'subcategorias'}`,
  className,
}: CategoryCarouselProps) {
  const { options, loading } = useResourceOptions<StatRow>({ resource });

  const items = useMemo<CategoryCarouselItem[]>(() => {
    const map = new Map<number, CategoryCarouselItem>();
    for (const row of options ?? []) {
      const cid = Number(row.categoryId);
      if (!Number.isFinite(cid) || cid <= 0) continue;
      const name = String(row.categoryName ?? row.name ?? `Categoria ${cid}`);
      const entry = map.get(cid) ?? { id: cid, name, count: 0 };
      entry.count += 1;
      map.set(cid, entry);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [options]);

  if (!loading && items.length === 0) return null;

  const maxW = 'mx-auto w-full max-w-6xl px-4 sm:px-6';

  if (variant === 'compact') {
    return (
      <section className={className ?? `${maxW} py-8`}>
        <Header title={title} allLabel={allLabel} allHref={allHref} compact />
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-[76px] w-20 shrink-0 animate-pulse rounded-2xl bg-muted" />
              ))
            : items.map((c) => (
                <Link
                  key={c.id}
                  href={hrefFor(c)}
                  className="flex w-20 shrink-0 flex-col items-center gap-2 rounded-2xl border border-border bg-card py-3 text-center transition-transform active:scale-95"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
                    {iconFor(c)}
                  </span>
                  <span className="line-clamp-2 text-[11px] font-semibold text-foreground">
                    {c.name}
                  </span>
                </Link>
              ))}
        </div>
      </section>
    );
  }

  return (
    <section className={className ?? `${maxW} py-14`}>
      <Header title={title} allLabel={allLabel} allHref={allHref} />
      <div className="mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[132px] min-w-[200px] animate-pulse rounded-2xl bg-muted" />
            ))
          : items.map((c) => (
              <Link
                key={c.id}
                href={hrefFor(c)}
                className="group flex min-w-[200px] snap-start flex-col gap-4 rounded-2xl border border-border/70 bg-muted/50 p-5 transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  {iconFor(c)}
                </span>
                <span>
                  <span className="block font-medium leading-snug text-foreground">{c.name}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {countLabel(c.count)}
                  </span>
                </span>
              </Link>
            ))}
      </div>
    </section>
  );
}

function Header({
  title,
  allLabel,
  allHref,
  compact,
}: {
  title: string;
  allLabel?: string;
  allHref?: string;
  compact?: boolean;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2
        className={
          compact
            ? 'text-lg font-bold tracking-tight text-foreground'
            : 'font-display text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-[-0.02em] text-foreground'
        }
      >
        {title}
      </h2>
      {allLabel && allHref ? (
        <Link
          href={allHref}
          className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {allLabel}
        </Link>
      ) : null}
    </div>
  );
}
