"use client";

import {
  CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useCardPrefetch } from "../link-prefetch";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useResourceOptions } from "../../hooks";
import { resolveLucideIcon } from "../../../lib/lucide-icon";
import { SectionHeading, SectionHeadingLink } from "../ui-better-soft/headers/section-heading";
import {
  buildCategoryItems,
  buildGroupItems,
  type CategoryCarouselFacetRow as FacetRow,
  type CategoryCarouselGroupRow as GroupRow,
  type CategoryCarouselItem,
  type CategoryCarouselListingRow as ListingRow,
  type CategoryCarouselStatRow as StatRow,
} from "./category-carousel-items";

export type { CategoryCarouselItem } from "./category-carousel-items";

export type CategoryCarouselProps = {
  variant?: "classic" | "compact";
  /**
   * `category` (default): um card por categoria. `group`: um card por grupo de categorias
   * (`categories_group`), levando à busca filtrada pelo grupo (`/busca?group=<slug>`).
   */
  groupBy?: "category" | "group";
  /** Recurso a buscar (default 'category_stats' — só categorias com subcategoria ativa). */
  resource?: string;
  title?: string;
  /** Link "ver todas". Se ausente, não renderiza o link. */
  allLabel?: string;
  allHref?: string;
  /** href de cada card. Default: `/busca?categoryId=<id>` (ou `/busca?group=<slug>` por grupo). */
  hrefFor?: (item: CategoryCarouselItem) => string;
  /** ícone de cada card. Default: <Tag />. */
  iconFor?: (item: CategoryCarouselItem) => ReactNode;
  /** label do contador (compact esconde). Default: `(n) => \`${n} subcategorias\``. */
  countLabel?: (count: number) => string;
  /** texto quando não há categorias. Default: "Nenhuma categoria disponível." */
  emptyLabel?: string;
  /** se true, esconde a seção inteira quando vazia (default false — mostra título + mensagem). */
  hideWhenEmpty?: boolean;
  /**
   * Se true, mostra só categorias com ao menos um anúncio publicado — cruza com
   * `listingsResource`. Requer o plugin `services` (view `vw_category_service_stats`).
   */
  onlyWithListings?: boolean;
  /** Recurso com a contagem de anúncios por categoria (default 'category_service_stats'). */
  listingsResource?: string;
  /**
   * Cards já montados no servidor (ex.: `buildCategoryItems`/`buildGroupItems` num Server Component):
   * com eles o carrossel não busca nada no navegador e já sai completo no HTML. Ausente = busca
   * no cliente, como sempre.
   */
  items?: CategoryCarouselItem[];
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
  groupBy = "category",
  resource = "category_stats",
  title = "Categorias",
  allLabel,
  allHref,
  hrefFor,
  iconFor = (c) => getIcon(c),
  countLabel,
  emptyLabel = "Nenhuma categoria disponível.",
  hideWhenEmpty = false,
  onlyWithListings = false,
  listingsResource = "category_service_stats",
  items: prefetchedItems,
  className,
}: CategoryCarouselProps) {
  // Cards seguem a política de prefetch das listas (`LinkPrefetchProvider`); sem ela, padrão do Next.
  const prefetch = useCardPrefetch();
  const fetchOnClient = prefetchedItems === undefined;
  const { options, loading: loadingTaxonomy } = useResourceOptions<StatRow>({
    resource,
    enabled: fetchOnClient,
    dedupe: true,
  });
  const { options: listingRows, loading: loadingListings } = useResourceOptions<ListingRow>({
    resource: listingsResource,
    enabled: fetchOnClient && onlyWithListings,
    dedupe: true,
  });
  const byGroup = groupBy === "group";
  const { options: groupRows, loading: loadingGroups } = useResourceOptions<GroupRow>({
    resource: "categories_group_public",
    enabled: fetchOnClient && byGroup,
    dedupe: true,
  });
  const {
    options: facetRows,
    loading: loadingFacets,
    error: facetsError,
  } = useResourceOptions<FacetRow>({
    resource: "category_service_facets",
    enabled: fetchOnClient && byGroup && onlyWithListings,
    dedupe: true,
  });
  const loading =
    loadingTaxonomy ||
    loadingListings ||
    (byGroup && (loadingGroups || (onlyWithListings && loadingFacets)));

  const href =
    hrefFor ??
    ((c: CategoryCarouselItem) =>
      byGroup && c.slug
        ? `/busca?group=${encodeURIComponent(c.slug)}`
        : `/busca?categoryId=${c.id}`);
  const label =
    countLabel ??
    ((n: number) =>
      byGroup
        ? `${n} ${n === 1 ? "categoria" : "categorias"}`
        : `${n} ${n === 1 ? "subcategoria" : "subcategorias"}`);

  const categoryItems = useMemo<CategoryCarouselItem[]>(
    () => buildCategoryItems(options, listingRows, onlyWithListings),
    [options, listingRows, onlyWithListings],
  );

  // Por grupo: ver `buildGroupItems` (facetas, ou grupo primário quando a view não tem as facetas).
  const groupItems = useMemo<CategoryCarouselItem[]>(
    () =>
      byGroup
        ? buildGroupItems({
            stats: options,
            groups: groupRows,
            facets: facetRows,
            facetsError: Boolean(facetsError),
            onlyWithListings,
            categoryItems,
          })
        : [],
    [byGroup, onlyWithListings, facetsError, facetRows, categoryItems, options, groupRows],
  );

  const items = prefetchedItems ?? (byGroup ? groupItems : categoryItems);

  const empty = !loading && items.length === 0;
  if (empty && hideWhenEmpty) return null;

  const maxW = "mx-auto w-full max-w-[1600px] px-4 sm:px-6";
  const emptyBox = (
    <div className="mt-4 rounded-[var(--ui-radius-card,1rem)] border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
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
          <ScrollRail
            className="mt-4"
            trackClassName="flex gap-3 overflow-x-auto p-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            watch={loading ? -1 : items.length}
          >
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square w-24 shrink-0 animate-pulse rounded-2xl bg-muted"
                  />
                ))
              : items.map((c) => (
                  <Link
                    key={c.id}
                    href={href(c)}
                    prefetch={prefetch}
                    className="flex aspect-square w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-[var(--ui-radius-card,1rem)] border-[length:var(--ui-border-w-card,1px)] border-border shadow-[shadow:var(--ui-shadow-item,0_0_#0000)] bg-card p-1.5 text-center transition-transform active:scale-95"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary [&_svg]:size-6">
                      {iconFor(c)}
                    </span>
                    <span className="line-clamp-2 text-xs font-semibold leading-tight text-foreground">
                      {c.name}
                    </span>
                  </Link>
                ))}
          </ScrollRail>
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
        <ScrollRail
          className="mt-6"
          trackClassName="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          watch={loading ? -1 : items.length}
        >
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
                  href={href(c)}
                  prefetch={prefetch}
                  className="group flex min-w-[200px] snap-start flex-col gap-4 rounded-[var(--ui-radius-card,1rem)] border-[length:var(--ui-border-w-card,1px)] border-border/70 shadow-[shadow:var(--ui-shadow-item,0_0_#0000)] bg-muted/50 p-5 transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    {iconFor(c)}
                  </span>
                  <span>
                    <span className="block font-medium leading-snug text-foreground">
                      {c.name}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {label(c.count)}
                    </span>
                  </span>
                </Link>
              ))}
        </ScrollRail>
      )}
    </section>
  );
}

/**
 * Trilho com rolagem horizontal + setas de navegação manual. Roda do mouse
 * vertical não rola o trilho no desktop, então as setas cobrem esse caso.
 * Só aparecem em dispositivos com hover (desktop) e somem sozinhas quando o
 * trilho encosta na beirada daquele lado.
 */
function ScrollRail({
  className,
  trackClassName,
  watch,
  children,
}: {
  className?: string;
  trackClassName: string;
  /** muda quando o conteúdo muda (ex.: nº de itens) — re-mede as beiradas */
  watch?: unknown;
  children: ReactNode;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    // tolerância de 2px pra arredondamento de subpixel/zoom
    setCanLeft(el.scrollLeft > 2);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [measure, watch]);

  const scrollBy = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const arrow =
    "absolute top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/70 p-1.5 text-foreground shadow-sm backdrop-blur-sm transition-opacity duration-200 hover:bg-background/90 [@media(hover:hover)]:flex";

  return (
    <div className={`relative ${className ?? ""}`}>
      <div ref={trackRef} className={trackClassName}>
        {children}
      </div>
      <button
        type="button"
        aria-label="Anterior"
        tabIndex={canLeft ? 0 : -1}
        onClick={() => scrollBy(-1)}
        className={`${arrow} left-1 ${canLeft ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <ChevronLeft className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Próximo"
        tabIndex={canRight ? 0 : -1}
        onClick={() => scrollBy(1)}
        className={`${arrow} right-1 ${canRight ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
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
  // Mesmo cabeçalho de seção dos outros blocos da home (título, barra e "ver todas").
  return (
    <SectionHeading
      title={title}
      // o trilho já tem o próprio espaço acima (mt-4 / mt-6)
      className="mb-0"
      action={allLabel && allHref ? <SectionHeadingLink href={allHref}>{allLabel}</SectionHeadingLink> : null}
    />
  );
}
