import { type ReactNode } from 'react';
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
export declare function CategoryCarousel({ variant, resource, title, allLabel, allHref, hrefFor, iconFor, countLabel, emptyLabel, hideWhenEmpty, className, }: CategoryCarouselProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=category-carousel.d.ts.map