"use client";

import { CSSProperties, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { useResourceOptions } from "../../hooks";
import { resolveLucideIcon } from "../../../lib/lucide-icon";
import { Typography } from "../ui/typography";
import { Grid } from "../ui";

type StatRow = {
  id: string | number;
  categoryId: string | number;
  categoryName?: string;
  categoryIcon?: string;
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
  variant?: "classic" | "compact";
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
  /** texto quando não há categorias. Default: "Nenhuma categoria disponível." */
  emptyLabel?: string;
  /** se true, esconde a seção inteira quando vazia (default false — mostra título + mensagem). */
  hideWhenEmpty?: boolean;
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

const getIcon = (category: any) => {
  const Icon = resolveLucideIcon(category.icon);
  return Icon ? <Icon className="size-5" /> : null;
};

export function CategoryCarousel({
  variant = "classic",
  resource = "category_stats",
  title = "Categorias",
  allLabel,
  allHref,
  hrefFor = (c) => `/busca?categoryId=${c.id}`,
  iconFor = (c) => getIcon(c),
  countLabel = (n) => `${n} ${n === 1 ? "subcategoria" : "subcategorias"}`,
  emptyLabel = "Nenhuma categoria disponível.",
  hideWhenEmpty = false,
  className,
}: CategoryCarouselProps) {
  const { options, loading } = useResourceOptions<StatRow>({ resource });

  const items = useMemo<CategoryCarouselItem[]>(() => {
    const map = new Map<number, CategoryCarouselItem>();
    for (const row of options ?? []) {
      const cid = Number(row.categoryId);
      if (!Number.isFinite(cid) || cid <= 0) continue;
      const name = String(row.categoryName ?? row.name ?? `Categoria ${cid}`);
      const icon = row.categoryIcon;
      const entry = map.get(cid) ?? { id: cid, name, icon, count: 0 };
      entry.count += 1;
      map.set(cid, entry);
    }
    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR"),
    );
  }, [options]);

  const empty = !loading && items.length === 0;
  if (empty && hideWhenEmpty) return null;

  const maxW = "mx-auto w-full max-w-6xl px-4 sm:px-6";
  const emptyBox = (
    <div className="mt-4 rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
      {emptyLabel}
    </div>
  );

  if (variant === "compact") {
    return (
      <section className={className ?? `${maxW} pt-8`}>
        <Header
          title={title}
          allLabel={allLabel}
          allHref={allHref}
          compact
          style={{ fontWeight: 500 }}
        />
        {empty ? (
          emptyBox
        ) : (
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[76px] w-20 shrink-0 animate-pulse rounded-2xl bg-muted"
                  />
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
        )}
      </section>
    );
  }

  return (
    <section className={className ?? `${maxW} py-14`}>
      <Header title={title} allLabel={allLabel} allHref={allHref} />
      {empty ? (
        emptyBox
      ) : (
        <div className="mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[132px] min-w-[200px] animate-pulse rounded-2xl bg-muted"
                />
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
                    <span className="block font-medium leading-snug text-foreground">
                      {c.name}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {countLabel(c.count)}
                    </span>
                  </span>
                </Link>
              ))}
        </div>
      )}
    </section>
  );
}

function Header({
  title,
  allLabel,
  allHref,
  compact,
  style,
}: {
  title: string;
  allLabel?: string;
  allHref?: string;
  compact?: boolean;
  style?: CSSProperties | undefined;
}) {
  return (
    <Grid container containerSize="fluid">
      <Grid sm={10} >
        <Typography.H4 font="display">{title}</Typography.H4>
      </Grid>
      {allLabel && allHref ? (
        <Grid sm={2}>
          <Link
            href={allHref}
            className="float-right text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground underline"
          >
            {allLabel}
          </Link>
        </Grid>
      ) : null}
    </Grid>
  );
}
